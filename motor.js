// Motor de consultas.
// En localhost usa Oracle real (api.php). En otro sitio (GitHub Pages) lo SIMULA con
// PostgreSQL en el navegador (PGlite) traduciendo la sintaxis de Oracle.
(() => {
  const simular = location.search.includes('sim=1') || !['localhost', '127.0.0.1'].includes(location.hostname);

  async function oracle(cuerpo) {
    try {
      const r = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Practica': '1' }, body: JSON.stringify(cuerpo) });
      const res = await r.json();
      if (res.error) res.error = ERRORES.oracle(res.error);
      return res;
    } catch {
      return { error: 'ORA-12541: sin respuesta. Revisa que Apache y Oracle estén encendidos.' };
    }
  }

  // ---------- Traducción Oracle -> PostgreSQL ----------

  // Saca textos y comentarios para no traducir lo que va dentro de comillas
  function proteger(sql) {
    const textos = [];
    const guardar = t => `\u0001${textos.push(t) - 1}\u0001`;
    const limpio = sql.replace(
      /--[^\n]*|\/\*[\s\S]*?\*\/|\bq'(?:\[([\s\S]*?)\]|\{([\s\S]*?)\}|\(([\s\S]*?)\)|<([\s\S]*?)>|!([\s\S]*?)!)'|'(?:[^']|'')*'|"[^"]*"/gi,
      (m, a, b, c, d, e) => {
        if (m.startsWith('--') || m.startsWith('/*')) return ' ';
        if (/^q'/i.test(m)) return guardar(`'${(a ?? b ?? c ?? d ?? e).replace(/'/g, "''")}'`);
        return guardar(m === "''" ? 'NULL' : m);   // en Oracle '' es NULL
      });
    return { limpio, restaurar: s => s.replace(/\u0001(\d+)\u0001/g, (_, i) => textos[i]) };
  }

  function cierre(s, abre) {
    for (let i = abre, n = 0; i < s.length; i++) {
      if (s[i] === '(') n++;
      else if (s[i] === ')' && --n === 0) return i;
    }
    return -1;
  }

  function partir(s) {
    const partes = [];
    let n = 0, ini = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') n++;
      else if (s[i] === ')') n--;
      else if (s[i] === ',' && !n) { partes.push(s.slice(ini, i)); ini = i + 1; }
    }
    partes.push(s.slice(ini));
    return partes.map(p => p.trim());
  }

  // Reemplaza cada llamada nombre(...) usando una función sobre sus argumentos
  function llamadas(s, nombre, fn) {
    const re = new RegExp(`\\b${nombre}\\s*\\(`, 'i');
    const m = re.exec(s);
    if (!m) return s;
    const abre = m.index + m[0].length - 1, fin = cierre(s, abre);
    if (fin < 0) return s;
    const args = partir(s.slice(abre + 1, fin)).map(a => llamadas(a, nombre, fn));
    return s.slice(0, m.index) + fn(args) + llamadas(s.slice(fin + 1), nombre, fn);
  }

  const faltan = n => { throw new Error(`ORA-00909: número de argumentos no válido en ${n}`); };

  // (SELECT MAX(SUM(x)) FROM ... GROUP BY ...) no existe en PostgreSQL: se parte en dos niveles
  function anidadas(s) {
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== '(') continue;
      const fin = cierre(s, i);
      if (fin < 0) break;
      const dentro = s.slice(i + 1, fin);
      const m = /^\s*select\s+(max|min|avg|sum)\s*\(\s*(?=(sum|count|avg|max|min)\s*\()/i.exec(dentro);
      if (!m) continue;
      const abre = dentro.indexOf('(', m[0].indexOf(m[1]) + m[1].length);
      const cierra = cierre(dentro, abre);
      const interna = dentro.slice(abre + 1, cierra), resto = dentro.slice(cierra + 1);
      if (!/^\s*from\b[\s\S]*\bgroup\s+by\b/i.test(resto)) continue;
      s = `${s.slice(0, i + 1)}SELECT ${m[1]}(v) FROM (SELECT ${interna} AS v ${resto}) anidada${s.slice(fin)}`;
    }
    return s;
  }

  // Cambios propios de CREATE / ALTER / DROP
  function ddl(s) {
    const secuencias = [];
    const tabla = /^\s*create\s+table\s+(\w+)/i.exec(s)?.[1];
    if (tabla) s = s.replace(/\bnumber(?:\s*\(\s*\d+\s*\))?\s+generated\s+(?:by\s+default|always)(?:\s+on\s+null)?\s+as\s+identity/gi, () => {
      secuencias.push(`CREATE SEQUENCE seq_${tabla};`);
      return `numeric DEFAULT nextval('seq_${tabla}')`;
    });
    s = s.replace(/(\(\s*\d+)\s+(?:char|byte)\s*\)/gi, '$1)')
      .replace(/\bnumber\b/gi, 'numeric')
      .replace(/(\w+\s+)date\b/gi, (t, antes) => /^(sys|to_)/i.test(antes) ? t : `${antes}timestamp(0)`)
      .replace(/\bcascade\s+constraints\b/gi, 'CASCADE')
      .replace(/\b(nocache|nocycle|noorder|nomaxvalue|nominvalue)\b/gi, ' ');
    const alt = /^(\s*alter\s+table\s+\w+\s+)(add|modify|drop)\b\s*([\s\S]*)$/i.exec(s);
    if (alt) {
      let [, inicio, accion, resto] = alt;
      accion = accion.toLowerCase();
      resto = resto.trim();
      if (resto.startsWith('(') && cierre(resto, 0) === resto.length - 1) resto = resto.slice(1, -1);
      if (!/^(constraint|primary|unique|foreign|check|column)\b/i.test(resto)) {
        s = inicio + partir(resto).map(c => {
          if (accion === 'add') return /^(constraint|primary|unique|foreign|check)\b/i.test(c) ? `ADD ${c}` : `ADD COLUMN ${c}`;
          if (accion === 'drop') return `DROP COLUMN ${c}`;
          const [, col, def] = /^(\w+)\s+([\s\S]+)$/.exec(c) || [null, c, ''];
          const nn = /\s*\b(not\s+null|null)\s*$/i.exec(def);
          const tipo = (nn ? def.slice(0, nn.index) : def).trim();
          const cambios = [];
          if (/^default\b/i.test(tipo)) cambios.push(`ALTER COLUMN ${col} SET ${tipo}`);
          else if (tipo) cambios.push(`ALTER COLUMN ${col} TYPE ${tipo}`);
          if (nn) cambios.push(`ALTER COLUMN ${col} ${/not/i.test(nn[1]) ? 'SET' : 'DROP'} NOT NULL`);
          return cambios.join(', ');
        }).join(', ');
      }
    }
    return secuencias.join('') + s;
  }

  function traducir(sql) {
    const { limpio, restaurar } = proteger(sql);
    let s = limpio;
    s = llamadas(s, 'nvl2', a => a.length === 3 ? `(CASE WHEN (${a[0]}) IS NOT NULL THEN ${a[1]} ELSE ${a[2]} END)` : faltan('NVL2'));
    s = llamadas(s, 'nvl', a => a.length === 2 ? `coalesce(${a[0]}, ${a[1]})` : faltan('NVL'));
    s = llamadas(s, 'decode', a => {
      if (a.length < 3) faltan('DECODE');
      const [e, ...r] = a;
      let c = '(CASE';
      while (r.length > 1) { const v = r.shift(); c += ` WHEN (${e}) IS NOT DISTINCT FROM (${v}) THEN ${r.shift()}`; }
      return `${c}${r.length ? ` ELSE ${r[0]}` : ''} END)`;
    });
    s = anidadas(s);
    if (/^\s*(create|alter|drop)\b/i.test(s)) s = ddl(s);
    // en MERGE, PostgreSQL no admite alias.columna a la izquierda del SET ni en las columnas del INSERT
    if (/^\s*merge\b/i.test(s)) s = s
      .replace(/(\bupdate\s+set\b)([\s\S]*?)(?=\bwhen\b|$)/gi, (t, a, b) => `${a} ${partir(b.trim()).map(x => x.replace(/^\w+\./, '')).join(', ')} `)
      .replace(/(\binsert\s*\()([^)]*)\)/gi, (t, a, b) => `${a}${b.replace(/\b\w+\./g, '')})`);
    s = s.replace(/^(\s*delete)\s+(?!from\b)(?=\w)/i, '$1 FROM ')
      .replace(/\b(\w+)\.nextval\b/gi, "nextval('$1')")
      .replace(/\b(\w+)\.currval\b/gi, "currval('$1')");
    s = s.replace(/\bminus\b/gi, 'EXCEPT')
      .replace(/\bsysdate\b/gi, 'LOCALTIMESTAMP(0)')
      .replace(/\bvarchar2\b/gi, 'varchar')
      .replace(/\bnumber\b(?=\s*[(),])/gi, 'numeric')
      .replace(/\bsubstr\s*\(/gi, 'ora_substr(');
    return restaurar(s);
  }

  const esBloque = sql => /^\s*(declare|begin)\b/i.test(proteger(sql).limpio);

  // Bloque PL/SQL -> DO de PL/pgSQL. Las variables bind entran y salen del bloque.
  function traducirBloque(sql, binds = {}) {
    // primero funciones de SQL (NVL, DECODE...), después lo propio de PL/SQL
    const { limpio, restaurar } = proteger(traducir(sql.replace(/\n\s*\/\s*$/, '')));
    let s = limpio.trim();
    if (!s.endsWith(';')) s += ';';
    const usados = [];
    s = s.replace(/(?<![:\w]):([a-z_]\w*)/gi, (t, n) => {
      n = n.toLowerCase();
      if (!binds[n]) throw new Error(`SP2-0552: variable bind "${n.toUpperCase()}" no declarada`);
      if (!usados.includes(n)) usados.push(n);
      return `b__${n}`;
    });
    const confirma = /\bcommit\s*;/i.test(s);
    // PL/pgSQL no tiene cursor%ROWTYPE: se usa record
    for (const [, c] of s.matchAll(/\bcursor\s+(\w+)\s+is\b/gi)) s = s.replace(new RegExp(`\\b${c}%rowtype\\b`, 'gi'), 'record');
    s = s.replace(/\bcommit\s*;/gi, 'NULL;')
      .replace(/\bnumber\b/gi, 'numeric')
      .replace(/\b(pls_integer|binary_integer|simple_integer)\b/gi, 'integer')
      .replace(/\bclob\b/gi, 'text')
      .replace(/\b(\w+\s+(?:constant\s+)?)date\b(?=\s*(?:;|:=|not\b|default\b))/gi, '$1timestamp(0)')
      .replace(/\bzero_divide\b/gi, 'division_by_zero')
      .replace(/\bdup_val_on_index\b/gi, 'unique_violation')
      .replace(/\b(value_error|invalid_number)\b/gi, 'data_exception')
      .replace(/\b\w+%notfound\b/gi, '(NOT FOUND)')
      .replace(/\b\w+%found\b/gi, 'FOUND')
      .replace(/\bcursor\s+(\w+)\s+is\b/gi, '$1 CURSOR FOR')
      .replace(/\bin\s+reverse\s+([^;]+?)\s*\.\.\s*([^;]+?)\s+loop\b/gi, 'IN REVERSE $2..$1 LOOP')
      // SELECT ... INTO debe fallar si no hay filas o hay varias, como en Oracle
      .replace(/((?:^|;|\bbegin|\bthen|\belse|\bloop)\s*select\b(?:(?!\bloop\b)[^;])*?\binto\s+)/gi, '$1STRICT ');
    s = llamadas(s, 'dbms_output\\.put_line', a => `RAISE NOTICE '%', coalesce((${a.join(', ')})::text, ' ')`);
    s = s.replace(/\bdbms_output\.new_line\b(\s*\(\s*\))?/gi, "RAISE NOTICE '%', ' '");
    s = llamadas(s, 'raise_application_error', a => `RAISE EXCEPTION 'ORA-%: %', abs(${a[0]}), ${a[1]}`);
    // las variables de FOR r IN (SELECT ...) hay que declararlas
    const registros = [...new Set([...s.matchAll(/\bfor\s+(\w+)\s+in\s*\(?\s*select\b/gi)].map(m => m[1].toLowerCase()))];
    if (registros.length) {
      const decl = registros.map(r => `${r} record;`).join(' ');
      s = /^declare\b/i.test(s) ? s.replace(/^declare\b/i, `DECLARE ${decl}`) : `DECLARE ${decl} ${s}`;
    }
    const texto = v => v === null || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
    const declaran = usados.map(n => `b__${n} ${binds[n].tipo} := ${texto(binds[n].valor)};`).join(' ');
    const devuelven = usados.map(n => `PERFORM set_config('bind.${n}', coalesce(b__${n}::text, ''), false);`).join(' ');
    return { codigo: `DO $plsql$ ${declaran ? 'DECLARE ' + declaran : ''} BEGIN\n${restaurar(s)}\n${devuelven} END $plsql$`, usados, confirma };
  }

  async function bloque(db, cuerpo) {
    const salida = [];
    const { codigo, usados, confirma } = traducirBloque(cuerpo.sql, cuerpo.binds);
    const inicio = performance.now();
    try {
      await protegido(db, false, () => db.exec(codigo, { onNotice: n => salida.push(n.message) }));
    } catch (e) { return { error: ERRORES.simulador(e), salida }; }
    const binds = {};
    for (const n of usados) {
      const v = (await db.query('SELECT current_setting($1, true) AS v', [`bind.${n}`])).rows[0].v || null;
      binds[n] = v !== null && cuerpo.binds[n].tipo === 'numeric' ? String(Number(v)) : v;
    }
    if (confirma) await cerrarTx(db, 'COMMIT');
    return { mensaje: '\nProcedimiento PL/SQL terminado correctamente.\n', salida, binds, ms: Math.round(performance.now() - inicio) };
  }

  // Separa un texto con varias sentencias (por ; o por / en una línea sola)
  function sentencias(texto) {
    const { limpio, restaurar } = proteger(texto);
    return limpio.split(/;|^\s*\/\s*$/m).map(x => restaurar(x).trim()).filter(Boolean);
  }

  // ---------- Base simulada ----------

  const FUNCIONES = `
CREATE TABLE dual (dummy varchar(1)); INSERT INTO dual VALUES ('X');
CREATE VIEW user_tables AS SELECT upper(table_name::text) AS table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> 'dual';
CREATE VIEW tab AS SELECT upper(table_name::text) AS tname, CASE table_type WHEN 'VIEW' THEN 'VIEW' ELSE 'TABLE' END AS tabtype
  FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT IN ('dual', 'tab', 'user_tables') ORDER BY 1;
CREATE FUNCTION regexp_like(t text, p text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT t ~ p $$;
CREATE FUNCTION ora_substr(t text, p numeric, n numeric DEFAULT NULL) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN n IS NULL THEN substring(t FROM i) ELSE substring(t FROM i FOR greatest(n::int, 0)) END
  FROM (SELECT CASE WHEN p < 0 THEN length(t) + p::int + 1 WHEN p = 0 THEN 1 ELSE p::int END AS i) x $$;
CREATE FUNCTION instr(t text, b text, p numeric DEFAULT 1) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN strpos(substring(t FROM p::int), b) = 0 THEN 0 ELSE strpos(substring(t FROM p::int), b) + p - 1 END $$;
CREATE FUNCTION lpad(n numeric, l int, r text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT lpad(n::text, l, r) $$;
CREATE FUNCTION length(n numeric) RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT length(n::text) $$;
CREATE FUNCTION to_char(n numeric) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT n::text $$;
CREATE FUNCTION to_number(t text) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT t::numeric $$;
CREATE FUNCTION trunc(d timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$ SELECT date_trunc('day', d) $$;
CREATE FUNCTION last_day(d timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$
  SELECT date_trunc('month', d) + interval '1 month - 1 day' $$;
CREATE FUNCTION add_months(d timestamp, n numeric) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN d::date = last_day(d)::date THEN last_day(d + make_interval(months => n::int))
              ELSE d + make_interval(months => n::int) END $$;
CREATE FUNCTION months_between(a timestamp, b timestamp) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT ((extract(year FROM a) - extract(year FROM b)) * 12 + extract(month FROM a) - extract(month FROM b))::numeric
    + CASE WHEN extract(day FROM a) = extract(day FROM b) OR (a::date = last_day(a)::date AND b::date = last_day(b)::date) THEN 0
           ELSE (extract(day FROM a) - extract(day FROM b))::numeric / 31 END $$;
`;

  let preparada;
  async function sembrar(db) {
    await db.exec(FUNCIONES);
    for (const s of sentencias(window.DATOS_SQL)) await db.exec(traducir(s));
  }
  function base() {
    return preparada ||= (async () => {
      const { PGlite } = await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.2.17/dist/index.js');
      let db;
      try { db = new PGlite('idb://tiosam-v1'); await db.waitReady; }   // los cambios quedan guardados
      catch { db = new PGlite(); await db.waitReady; }
      await db.exec("SET datestyle = 'ISO, DMY'");
      if (!(await db.query("SELECT to_regclass('public.dual') AS t")).rows[0].t) {
        await db.exec('BEGIN');
        try { await sembrar(db); await db.exec('COMMIT'); }
        catch (e) { await db.exec('ROLLBACK'); throw e; }
      }
      return db;
    })().catch(e => { preparada = null; throw e; });
  }

  const fecha = v => { const [a, m, d] = String(v).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
  function formato(v, tipo) {
    if (v === null) return null;
    if (tipo === 1082 || tipo === 1114) return fecha(v);
    let t = String(v);
    if (tipo === 1700) { if (t.includes('.')) t = t.replace(/\.?0+$/, ''); t = t.replace(/^(-?)0\./, '$1.'); }
    return t;
  }

  // Oracle titula una columna sin alias con la expresión escrita: COUNT(*), PRECIO*2
  function titulos(sql, campos) {
    const { limpio, restaurar } = proteger(sql);
    const ini = /^\s*select\s+(?:(?:distinct|all|unique)\s+)?/i.exec(limpio);
    let items = [];
    if (ini) {
      let nivel = 0, fin = ini[0].length;
      for (; fin < limpio.length; fin++) {
        if (limpio[fin] === '(') nivel++;
        else if (limpio[fin] === ')') nivel--;
        else if (!nivel && /^\bfrom\b/i.test(limpio.slice(fin)) && !/\w/.test(limpio[fin - 1])) break;
      }
      items = partir(limpio.slice(ini[0].length, fin));
    }
    const sirve = items.length === campos.length && !items.some(x => x === '*' || x.endsWith('.*'));
    return campos.map((c, i) => sirve && (c.name === '?column?' || c.name === 'case' || items[i].endsWith(')'))
      ? restaurar(items[i]).replace(/\s+/g, '').toUpperCase() : c.name.toUpperCase());
  }

  // ---------- Ejecución con transacciones como en Oracle ----------
  let abierta = false;
  async function abrirTx(db) { if (!abierta) { await db.exec('BEGIN'); abierta = true; } }
  async function cerrarTx(db, orden) { if (abierta) { abierta = false; await db.exec(orden); } }

  // Corre algo dentro de un punto de salvaguarda: un error no rompe la transacción
  async function protegido(db, deshacer, fn) {
    await abrirTx(db);
    await db.exec('SAVEPOINT paso__');
    let bien = false;
    try { const r = await fn(); bien = true; return r; }
    finally { await db.exec(`${bien && !deshacer ? '' : 'ROLLBACK TO SAVEPOINT paso__; '}RELEASE SAVEPOINT paso__`); }
  }

  const filasMsg = (n, verbo) => `\n${n} ${n === 1 ? 'fila ' + verbo : 'filas ' + verbo + 's'}.\n`;
  const OBJETOS = { table: ['Tabla', 'a'], view: ['Vista', 'a'], sequence: ['Secuencia', 'a'], index: ['Índice', 'o'], synonym: ['Sinónimo', 'o'] };

  async function ejecutar(db, cuerpo) {
    const consultar = (q, p) => db.query(q, p, { rowMode: 'array', parsers: { 20: String, 1700: String, 1082: String, 1114: String } });
    if (cuerpo.reiniciar) {
      await cerrarTx(db, 'ROLLBACK');
      await db.exec('BEGIN');
      try { await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public'); await sembrar(db); await db.exec('COMMIT'); }
      catch (e) { await db.exec('ROLLBACK'); throw e; }
      return { mensaje: '\nBase restaurada con los datos originales.\n' };
    }
    if (cuerpo.esquema) {
      return protegido(db, true, async () => {
        const r = {};
        for (const [t] of (await consultar('SELECT table_name FROM user_tables ORDER BY 1')).rows)
          r[t.toLowerCase()] = { filas: Number((await consultar(`SELECT count(*) FROM ${t}`)).rows[0][0]) };
        return r;
      });
    }
    if (esBloque(cuerpo.sql)) return bloque(db, cuerpo);
    if (/^\s*create(\s+or\s+replace)?\s+(procedure|function|trigger|package)\b/i.test(proteger(cuerpo.sql).limpio))
      return { error: 'ORA-00900: el simulador aún no crea procedimientos, funciones, triggers ni paquetes' };
    const sql = sentencias(cuerpo.sql)[0];
    if (!sql) return { error: 'Escribe una sentencia.' };
    const verbo = /^[\s(]*(\w+)/.exec(sql)?.[1].toLowerCase();

    const desc = /^desc(?:ribe)?\s+(\w+)$/i.exec(sql);
    if (desc) {
      const r = await protegido(db, true, () => consultar(`SELECT upper(column_name), CASE data_type
          WHEN 'character varying' THEN 'VARCHAR2(' || character_maximum_length || ')' WHEN 'character' THEN 'CHAR(' || character_maximum_length || ')'
          WHEN 'numeric' THEN 'NUMBER' || coalesce('(' || numeric_precision || CASE WHEN numeric_scale > 0 THEN ',' || numeric_scale ELSE '' END || ')', '')
          WHEN 'text' THEN 'VARCHAR2' ELSE 'DATE' END || CASE is_nullable WHEN 'NO' THEN '  NOT NULL' ELSE '' END
        FROM information_schema.columns WHERE table_schema = 'public' AND table_name = lower($1) ORDER BY ordinal_position`, [desc[1]]));
      return r.rows.length ? { columnas: ['NOMBRE', 'TIPO'], filas: r.rows, ms: 0 } : { error: `ORA-04043: el objeto ${desc[1]} no existe` };
    }
    if (verbo === 'commit') { await cerrarTx(db, 'COMMIT'); return { mensaje: '\nConfirmación terminada.\n' }; }
    if (verbo === 'rollback') {
      const a = /^rollback(?:\s+work)?\s+to(?:\s+savepoint)?\s+(\w+)$/i.exec(sql);
      if (a) {
        if (!abierta) return { error: 'ORA-01086: no se ha establecido ese punto de salvaguarda' };
        await volverA(db, a[1]);
      } else await cerrarTx(db, 'ROLLBACK');
      return { mensaje: '\nRollback terminado.\n' };
    }
    if (verbo === 'savepoint') {
      const n = /^savepoint\s+(\w+)$/i.exec(sql);
      if (!n) return { error: 'ORA-00900: sentencia no válida' };
      await abrirTx(db);
      await db.exec(`SAVEPOINT ${n[1]}`);
      return { mensaje: '\nPunto de salvaguarda creado.\n' };
    }
    if (verbo === 'select' || verbo === 'with') {
      const inicio = performance.now();
      const r = await protegido(db, true, () => consultar(traducir(sql)));
      return {
        columnas: titulos(sql, r.fields),
        filas: r.rows.slice(0, 5000).map(f => f.map((v, i) => formato(v, r.fields[i].dataTypeID))),
        ms: Math.round(performance.now() - inicio),
      };
    }
    // el contador de PGlite no incluye MERGE: se cuenta dentro de un bloque
    if (verbo === 'merge') {
      await protegido(db, false, () => db.exec(`DO $merge$ DECLARE n bigint; BEGIN ${traducir(sql)}; GET DIAGNOSTICS n = ROW_COUNT; PERFORM set_config('merge.filas', n::text, false); END $merge$`));
      const n = Number((await db.query("SELECT current_setting('merge.filas') AS n")).rows[0].n);
      return { mensaje: filasMsg(n, 'fusionada') };
    }
    if (['insert', 'update', 'delete'].includes(verbo)) {
      const r = await protegido(db, false, () => db.query(traducir(sql)));
      return { mensaje: filasMsg(r.affectedRows ?? 0, { insert: 'creada', update: 'actualizada', delete: 'suprimida' }[verbo]) };
    }
    if (['create', 'alter', 'drop', 'truncate', 'comment'].includes(verbo)) {
      const q = traducir(sql);
      await cerrarTx(db, 'COMMIT');            // en Oracle el DDL confirma solo
      await db.exec('BEGIN');
      try { await db.exec(q); await db.exec('COMMIT'); }
      catch (e) { await db.exec('ROLLBACK'); throw e; }
      if (verbo === 'truncate') return { mensaje: '\nTabla truncada.\n' };
      if (verbo === 'comment') return { mensaje: '\nComentario creado.\n' };
      const tipo = /\b(table|view|sequence|index|synonym)\b/i.exec(sql)?.[1].toLowerCase();
      const [nombre, g] = OBJETOS[tipo] || ['Objeto', 'o'];
      const hecho = { create: 'cread', alter: 'modificad', drop: 'borrad' }[verbo] + g;
      return { mensaje: `\n${nombre} ${hecho}.\n` };
    }
    if (verbo === 'grant' || verbo === 'revoke') return { error: 'ORA-00900: el simulador no ejecuta GRANT ni REVOKE' };
    return { error: `SP2-0734: comando desconocido que empieza por "${sql.slice(0, 10)}..." - se ignora el resto.` };
  }

  // Vuelve a un SAVEPOINT del usuario sin perder la transacción si no existe
  async function volverA(db, nombre) {
    await db.exec('SAVEPOINT paso__');
    try { await db.exec(`ROLLBACK TO SAVEPOINT ${nombre}`); }
    catch (e) { await db.exec('ROLLBACK TO SAVEPOINT paso__; RELEASE SAVEPOINT paso__'); throw e; }
  }

  // Una orden a la vez: COMPROBAR lanza dos consultas juntas
  let cola = Promise.resolve();
  function simulado(cuerpo) {
    const turno = cola.then(async () => {
      let db;
      try { db = await base(); }
      catch { return { error: 'No se pudo cargar el simulador. Revisa tu internet y vuelve a intentar.' }; }
      try { return await ejecutar(db, cuerpo); }
      catch (e) { return { error: ERRORES.simulador(e) }; }
    });
    cola = turno;
    return turno;
  }

  window.MOTOR = { simular, sentencias, proteger, pedir: simular ? simulado : oracle };
  if (simular) base().catch(() => {});
})();

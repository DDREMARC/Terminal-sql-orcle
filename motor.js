// Motor de consultas.
// En localhost usa Oracle real (api.php). En otro sitio (GitHub Pages) lo SIMULA con
// PostgreSQL en el navegador (PGlite) traduciendo la sintaxis de Oracle.
(() => {
  const simular = location.search.includes('sim=1') || !['localhost', '127.0.0.1'].includes(location.hostname);

  async function oracle(cuerpo) {
    try {
      const r = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Practica': '1' }, body: JSON.stringify(cuerpo) });
      return await r.json();
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
        return guardar(m);
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
    s = s.replace(/\bminus\b/gi, 'EXCEPT')
      .replace(/\bsysdate\b/gi, 'LOCALTIMESTAMP(0)')
      .replace(/\bvarchar2\b/gi, 'varchar')
      .replace(/\bnumber\b(?=\s*[(),])/gi, 'numeric')
      .replace(/\bsubstr\s*\(/gi, 'ora_substr(');
    return restaurar(s);
  }

  // ---------- Base simulada ----------

  const FUNCIONES = `
CREATE TABLE dual (dummy varchar(1)); INSERT INTO dual VALUES ('X');
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
  function base() {
    return preparada ||= (async () => {
      const { PGlite } = await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.2.17/dist/index.js');
      const db = new PGlite();
      await db.exec(FUNCIONES + window.DATOS_SQL);
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

  // Mensajes parecidos a los de Oracle para los errores más comunes
  function errorOracle(e) {
    const codigos = { '42P01': 'ORA-00942: la tabla o vista no existe', '42703': 'ORA-00904: identificador no válido', '42803': 'ORA-00979: no es una expresión GROUP BY',
      '42601': 'ORA-00933: comando SQL no terminado correctamente', '22012': 'ORA-01476: el divisor es igual a cero', '42883': 'ORA-00904: función o tipos de argumento no válidos',
      '42702': 'ORA-00918: columna definida de forma ambigua', '21000': 'ORA-01427: la subconsulta de una fila devuelve más de una fila', '22P02': 'ORA-01722: número no válido' };
    if (e.message.startsWith('ORA-')) return e.message;
    return `${codigos[e.code] || 'ORA-00900: sentencia no válida'}\n(simulador: ${e.message})`;
  }

  async function simulado(cuerpo) {
    let db;
    try { db = await base(); }
    catch (e) { return { error: 'No se pudo cargar el simulador. Revisa tu internet y vuelve a intentar.\n' + e.message }; }
    const consultar = (q, p) => db.query(q, p, { rowMode: 'array', parsers: { 20: String, 1700: String, 1082: String, 1114: String } });
    try {
      if (cuerpo.esquema) {
        const r = {};
        for (const [t] of (await consultar("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'dual' ORDER BY 1")).rows)
          r[t] = { filas: Number((await consultar(`SELECT count(*) FROM ${t}`)).rows[0][0]) };
        return r;
      }
      const sql = cuerpo.sql.trim().replace(/[;\/\s]+$/, '').replace(/^(\s+|--[^\n]*(\n|$)|\/\*[\s\S]*?\*\/)+/, '');
      const desc = /^desc(?:ribe)?\s+(\w+)$/i.exec(sql);
      if (desc) {
        const r = await consultar(`SELECT upper(column_name), CASE data_type WHEN 'character varying' THEN 'VARCHAR2(' || character_maximum_length || ')'
            WHEN 'character' THEN 'CHAR(' || character_maximum_length || ')' WHEN 'numeric' THEN 'NUMBER' ELSE 'DATE' END
          FROM information_schema.columns WHERE table_name = lower($1) ORDER BY ordinal_position`, [desc[1]]);
        return r.rows.length ? { columnas: ['NOMBRE', 'TIPO'], filas: r.rows, ms: 0 } : { error: `ORA-04043: el objeto ${desc[1]} no existe` };
      }
      if (!/^[\s(]*(select|with)\b/i.test(sql)) return { error: 'Esta práctica solo ejecuta SELECT y DESC.' };
      const inicio = performance.now();
      await db.exec('BEGIN READ ONLY');
      try {
        const r = await consultar(traducir(sql));
        return {
          columnas: r.fields.map(f => f.name.toUpperCase()),
          filas: r.rows.slice(0, 200).map(f => f.map((v, i) => formato(v, r.fields[i].dataTypeID))),
          ms: Math.round(performance.now() - inicio),
        };
      } finally { await db.exec('ROLLBACK'); }
    } catch (e) {
      return { error: errorOracle(e) };
    }
  }

  window.MOTOR = { simular, pedir: simular ? simulado : oracle };
  if (simular) base().catch(() => {});
})();

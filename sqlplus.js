// Comandos propios de SQL*Plus: buffer, SET, COLUMN, &variables, VARIABLE, SPOOL y scripts
(() => {
  const INICIAL = { linesize: null, pagesize: null, colsep: ' ', serveroutput: false, feedback: true, heading: true, verify: true, autoprint: false, timing: false, define: true };
  const cfg = { ...INICIAL };
  const columnas = {}, definidas = {}, binds = {};
  let buffer = '', spool = null, nivel = 0, io;

  const BLOQUE = /^\s*(declare|begin|create(\s+or\s+replace)?\s+(procedure|function|trigger|package))\b/i;
  const COMANDO = /^\s*(\/\s*$|@|(commit|rollback)\s*$|(glosario|ayuda|help|retos|reto|semana|siguiente|comprobar|pista|soluci[oó]n|tablas|clear|cls|reiniciar|show|set|desc|describe|l|list|r|run|ed|edit|col|column|def|define|undef|undefine|var|variable|print|spool|prompt|accept|exit|quit|start|exec|execute)(?=\s|;|$))/i;

  // Divide un texto en comandos, sentencias y bloques. "resto" es lo que aún no termina.
  function partir(texto) {
    const { limpio, restaurar } = MOTOR.proteger(texto);
    const unidades = [];
    let buf = '';
    const sumar = (t, tipo) => { if (t.trim()) unidades.push({ tipo, texto: restaurar(t).trim() }); };
    for (const linea of limpio.split('\n')) {
      if (!buf) {
        if (!linea.trim()) continue;
        if (COMANDO.test(linea)) { sumar(linea, 'cmd'); continue; }
      }
      if (/^\s*\/\s*$/.test(linea)) { sumar(buf, BLOQUE.test(buf) ? 'plsql' : 'sql'); buf = ''; continue; }
      buf += (buf ? '\n' : '') + linea;
      let fin;
      while (!BLOQUE.test(buf) && (fin = buf.indexOf(';')) >= 0) {
        sumar(buf.slice(0, fin), 'sql');
        buf = buf.slice(fin + 1);
        if (!buf.trim()) buf = '';
        else buf = buf.replace(/^\s+/, '');
      }
    }
    return { unidades, resto: restaurar(buf), plsql: BLOQUE.test(buf) };
  }

  const guardarBuffer = t => { buffer = t.replace(/\n\s*\.\s*$/, '').trim(); };

  // ---------- Tablas ----------

  function numero(v, f) {
    const [ent, dec = ''] = f.replace(/[^09.]/g, '').split('.');
    let [e, d] = Math.abs(Number(v)).toFixed(dec.length).split('.');
    if (e.length > ent.length) return '#'.repeat(f.length);
    if (/^\$?0/.test(f)) e = e.padStart(ent.length, '0');
    else if (e === '0' && dec) e = '';
    if (f.includes(',')) e = e.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (Number(v) < 0 ? '-' : '') + (f.includes('$') ? '$' : '') + e + (d ? '.' + d : '');
  }

  function tabla(res, aviso = cfg.feedback) {
    const filas = res.filas.map(f => f.map(v => String(v ?? '')));
    if (!filas.length) return aviso ? '\nninguna fila seleccionada\n' : '';
    const cols = res.columnas.map((nombre, i) => {
      const c = columnas[nombre.toLowerCase()] || {};
      let valores = filas.map(f => f[i]);
      const esNum = valores.some(v => v !== '') && valores.every(v => v === '' || /^-?\d*\.?\d+$/.test(v));
      const texto = /^a(\d+)$/i.exec(c.format || '');
      if (c.format && !texto && esNum) valores = valores.map(v => v === '' ? '' : numero(v, c.format));
      const titulo = c.heading ?? nombre;
      const ancho = texto ? Math.max(1, Number(texto[1])) : Math.max(titulo.length, c.format?.length ?? 0, ...valores.map(v => v.length));
      return { titulo: titulo.slice(0, ancho), valores, ancho, derecha: esNum };
    });
    const celda = (v, c) => c.derecha ? v.padStart(c.ancho) : v.padEnd(c.ancho);

    // SET LINESIZE: las columnas que no caben bajan a otra línea
    const grupos = [[]];
    let largo = 0;
    for (const c of cols) {
      const g = grupos[grupos.length - 1];
      if (cfg.linesize && g.length && largo + cfg.colsep.length + c.ancho > cfg.linesize) { grupos.push([c]); largo = c.ancho; }
      else { largo += (g.length ? cfg.colsep.length : 0) + c.ancho; g.push(c); }
    }
    const titulos = grupos.flatMap(g => [g.map(c => celda(c.titulo, c)).join(cfg.colsep), g.map(c => '-'.repeat(c.ancho)).join(cfg.colsep)]);
    const conTitulos = cfg.heading && cfg.pagesize !== 0;
    const porPagina = cfg.pagesize ? Math.max(1, cfg.pagesize - 3) : Infinity;

    const salida = [''];
    filas.forEach((_, n) => {
      if (conTitulos && n % porPagina === 0) salida.push(...(n ? [''] : []), ...titulos);
      for (const g of grupos) {
        // COLUMN ... FORMAT An: el texto largo continúa debajo
        const partes = g.map(c => c.valores[n].match(new RegExp(`.{1,${c.ancho}}`, 'g')) || ['']);
        for (let j = 0; j < Math.max(...partes.map(p => p.length)); j++)
          salida.push(g.map((c, k) => celda(partes[k][j] ?? '', c)).join(cfg.colsep));
      }
      if (grupos.length > 1 && n < filas.length - 1) salida.push('');
    });
    if (aviso) salida.push('', filas.length === 1 ? '1 fila seleccionada.' : filas.length + ' filas seleccionadas.');
    salida.push('');
    return salida.join('\n');
  }

  // ---------- Variables ----------

  async function sustituir(sql) {
    if (!cfg.define || !/&&?[a-z_]/i.test(sql)) return sql;
    const lineas = sql.split('\n');
    for (let i = 0; i < lineas.length; i++) {
      const vieja = lineas[i];
      let nueva = '', desde = 0;
      for (const m of vieja.matchAll(/(&&?)([a-z_]\w*)\.?/gi)) {
        const n = m[2].toLowerCase();
        let v = definidas[n];
        if (v === undefined) {
          v = await io.preguntar(`Introduzca un valor para ${n}: `);
          if (v === null) return null;
          if (m[1] === '&&') definidas[n] = v;
        }
        nueva += vieja.slice(desde, m.index) + v;
        desde = m.index + m[0].length;
      }
      if (!desde) continue;
      lineas[i] = nueva + vieja.slice(desde);
      if (cfg.verify) io.escribir(`antiguo ${String(i + 1).padStart(3)}: ${vieja}\nnuevo   ${String(i + 1).padStart(3)}: ${lineas[i]}`);
    }
    return lineas.join('\n');
  }

  const literal = b => b.valor === null || b.valor === '' ? 'NULL' : b.tipo === 'numeric' ? String(Number(b.valor)) : `'${String(b.valor).replace(/'/g, "''")}'`;

  // :variable dentro de una consulta se cambia por su valor
  function ponerBinds(sql) {
    const { limpio, restaurar } = MOTOR.proteger(sql);
    return restaurar(limpio.replace(/(?<![:\w]):([a-z_]\w*)/gi, (t, n) => binds[n.toLowerCase()] ? literal(binds[n.toLowerCase()]) : t));
  }

  function imprimir(nombres) {
    for (const n of nombres) {
      const b = binds[n];
      if (!b) io.escribir(`SP2-0552: variable bind "${n.toUpperCase()}" no declarada.`, 'error');
      else io.escribir(tabla({ columnas: [n.toUpperCase()], filas: [[b.valor]] }, false));
    }
  }

  // ---------- Ejecución ----------

  async function sql(texto, tipo) {
    guardarBuffer(texto);
    let s = await sustituir(texto.trim());
    if (s === null) return;
    const bloque = tipo === 'plsql' || BLOQUE.test(s);
    if (MOTOR.simular && !bloque) s = ponerBinds(s);
    const res = await MOTOR.pedir({ sql: s, binds: bloque ? binds : undefined });
    if (cfg.serveroutput && res.salida?.length) io.escribir(res.salida.join('\n'));
    if (res.error) io.escribir('\nERROR:\n' + res.error + '\n', 'error nota');
    else if (res.mensaje) { if (cfg.feedback) io.escribir(res.mensaje); }
    else {
      if (!/^desc/i.test(s)) io.consulta(s);
      const t = tabla(res);
      if (t) io.escribir(t);
    }
    if (res.binds) {
      const cambiadas = Object.keys(res.binds);
      for (const n of cambiadas) binds[n].valor = res.binds[n];
      if (cfg.autoprint) imprimir(cambiadas);
    }
    if (cfg.timing && !res.error) io.escribir(`Transcurrido: 00:00:${((res.ms || 0) / 1000).toFixed(2).padStart(5, '0')}`);
  }

  async function guion(texto) {
    const p = partir(texto);
    if (p.resto.trim()) p.unidades.push({ tipo: p.plsql ? 'plsql' : 'sql', texto: p.resto });
    for (const u of p.unidades) await io.unidad(u);
  }

  const listar = () => {
    if (!buffer) return io.escribir('SP2-0223: No hay líneas en el buffer SQL.', 'error');
    const l = buffer.split('\n');
    io.escribir(l.map((x, i) => `${String(i + 1).padStart(3)}${i === l.length - 1 ? '*' : ' '} ${x}`).join('\n'));
  };

  const CLAVES = { lin: 'linesize', linesize: 'linesize', pages: 'pagesize', pagesize: 'pagesize', colsep: 'colsep', serverout: 'serveroutput', serveroutput: 'serveroutput', feed: 'feedback', feedback: 'feedback', hea: 'heading', heading: 'heading', ver: 'verify', verify: 'verify', autop: 'autoprint', autoprint: 'autoprint', timi: 'timing', timing: 'timing', def: 'define', define: 'define' };
  const SIN_EFECTO = /^(echo|term|termout|trims|trimspool|trim|trimout|sqlbl|sqlblanklines|wrap|wra|long|numwidth|num|sqlprompt|sqlp|null|newpage|newp|tab|time|escape|esc)$/;
  const ver = k => `${k} ${typeof cfg[k] === 'boolean' ? (cfg[k] ? 'ON' : 'OFF') : k === 'colsep' ? `"${cfg[k]}"` : cfg[k] ?? 'sin límite'}`;
  const sinComillas = v => v.replace(/^(['"])([\s\S]*)\1$/, '$2');
  const palabras = t => t.match(/'[^']*'|"[^"]*"|[^\s=]+|=/g) || [];

  // Devuelve false si no es un comando de SQL*Plus (entonces se ejecuta como SQL)
  async function comando(texto) {
    const t = texto.trim().replace(/;\s*$/, '').trim();
    if (t === '/' || /^r(un)?$/i.test(t)) {
      if (!buffer) io.escribir('SP2-0103: No hay nada en el buffer SQL para ejecutar.', 'error');
      else { if (t !== '/') listar(); await sql(buffer); }
      return true;
    }
    if (/^(@|start\s)/i.test(t) || /^start$/i.test(t)) {
      if (nivel > 2) return io.escribir('SP2-0309: demasiados scripts anidados.', 'error'), true;
      io.escribir('Elige el archivo .sql en tu equipo...', 'info');
      const contenido = await io.elegirArchivo();
      if (contenido === null) io.escribir('SP2-0310: no se abrió ningún archivo.', 'error');
      else { nivel++; try { await guion(contenido.replace(/\r/g, '')); } finally { nivel--; } }
      return true;
    }
    const [primera, ...p] = palabras(t);
    const orden = (primera || '').toLowerCase(), resto = t.slice((primera || '').length).trim(), nombre = p[0]?.toLowerCase();
    switch (orden) {
      case 'l': case 'list': listar(); break;
      case 'ed': case 'edit':
        if (!buffer) io.escribir('SP2-0107: No hay nada que editar.', 'error');
        else io.editar(buffer + (BLOQUE.test(buffer) ? '\n/' : ';'));
        break;
      case 'clear':
        if (/^col/.test(nombre)) { for (const k in columnas) delete columnas[k]; io.escribir('columnas borradas'); }
        else if (/^buff?/.test(nombre)) { buffer = ''; io.escribir('buffer borrado'); }
        else io.limpiar();
        break;
      case 'set': {
        for (let i = 0; i < p.length; i++) {
          const palabra = p[i].toLowerCase(), k = CLAVES[palabra];
          if (!k) {
            if (SIN_EFECTO.test(palabra)) { i++; continue; }
            io.escribir(`SP2-0158: opción SET desconocida "${p[i]}"`, 'error'); break;
          }
          const v = p[++i] ?? '';
          if (k === 'colsep') cfg[k] = sinComillas(v);
          else if (k === 'linesize' || k === 'pagesize') {
            if (!/^\d+$/.test(v)) { io.escribir(`SP2-0268: la opción ${k} necesita un número`, 'error'); break; }
            cfg[k] = k === 'linesize' && v === '0' ? null : Number(v);
          } else if (/^(on|off)$/i.test(v)) cfg[k] = v.toLowerCase() === 'on';
          else { io.escribir(`SP2-0265: ${k} debe ser ON u OFF`, 'error'); break; }
          if (/^size$/i.test(p[i + 1] || '')) i += 2;
          if (/^(format|for)$/i.test(p[i + 1] || '')) i += 2;
        }
        break;
      }
      case 'show':
        if (nombre === 'user') io.escribir('USER es "TIOSAM"\n');
        else if (nombre === 'all') io.escribir(Object.keys(cfg).map(ver).join('\n'));
        else if (CLAVES[nombre]) io.escribir(ver(CLAVES[nombre]));
        else if (/^err/.test(nombre)) io.escribir('No hay errores.');
        else io.escribir(`SP2-0158: opción SHOW desconocida "${resto}"`, 'error');
        break;
      case 'col': case 'column': {
        if (!nombre) { io.escribir(Object.entries(columnas).map(([n, c]) => `COLUMN ${n} ${c.format ? 'FORMAT ' + c.format : ''} ${c.heading ? `HEADING '${c.heading}'` : ''}`).join('\n') || 'No hay columnas definidas.'); break; }
        const c = columnas[nombre] ||= {};
        for (let i = 1; i < p.length; i++) {
          const k = p[i].toLowerCase();
          if (/^(for|form|forma|format)$/.test(k)) c.format = sinComillas(p[++i] ?? '');
          else if (/^(hea|head|headi|headin|heading)$/.test(k)) c.heading = sinComillas(p[++i] ?? '');
          else if (/^(cle|clea|clear)$/.test(k)) delete columnas[nombre];
          else { io.escribir(`SP2-0158: opción COLUMN desconocida "${p[i]}"`, 'error'); break; }
        }
        break;
      }
      case 'def': case 'define':
        if (p[1] === '=') definidas[nombre] = sinComillas(resto.slice(resto.indexOf('=') + 1).trim());
        else {
          const lista = Object.entries(definidas).filter(([n]) => !nombre || n === nombre);
          io.escribir(lista.map(([n, v]) => `DEFINE ${n.toUpperCase()} = "${v}"`).join('\n') || `SP2-0135: el símbolo ${nombre || ''} no está definido`);
        }
        break;
      case 'undef': case 'undefine': for (const n of p) delete definidas[n.toLowerCase()]; break;
      case 'var': case 'variable':
        if (!nombre) io.escribir(Object.entries(binds).map(([n, b]) => `variable   ${n}\ntipo de datos  ${b.declarado}`).join('\n') || 'No hay variables declaradas.');
        else {
          const declarado = resto.slice(p[0].length).trim().toUpperCase() || 'NUMBER';
          binds[nombre] = { declarado, tipo: /^(NUMBER|BINARY|INT)/.test(declarado) ? 'numeric' : 'varchar', valor: null };
        }
        break;
      case 'print': imprimir(p.length ? p.map(x => x.replace(/^:/, '').toLowerCase()) : Object.keys(binds)); break;
      case 'prompt': io.escribir(resto); break;
      case 'accept': {
        if (!nombre) { io.escribir('Uso: ACCEPT nombre PROMPT \'texto\'', 'error'); break; }
        const m = /\bprompt\s+([\s\S]+)$/i.exec(resto);
        const v = await io.preguntar(m ? sinComillas(m[1].trim()) : '');
        if (v !== null) definidas[nombre] = v;
        break;
      }
      case 'spool':
        if (!nombre) io.escribir(spool ? `guardando en ${spool.nombre}` : 'no se está guardando en ningún archivo');
        else if (nombre === 'off') {
          if (!spool) io.escribir('no se está guardando en ningún archivo', 'error');
          else { io.descargar(spool.nombre, spool.texto.join('\n')); spool = null; }
        } else {
          const archivo = sinComillas(resto).split(/[\\/]/).pop();
          spool = { nombre: /\.\w+$/.test(archivo) ? archivo : archivo + '.txt', texto: [] };
          io.escribir('Se descargará al escribir SPOOL OFF.', 'info');
        }
        break;
      case 'exec': case 'execute': await sql(`BEGIN ${resto}; END;`, 'plsql'); break;
      case 'exit': case 'quit': io.escribir('Estás en la web: para salir cierra la pestaña.', 'info'); break;
      default: return false;
    }
    return true;
  }

  window.SP = {
    partir, comando, sql, tabla, guardarBuffer,
    iniciar: funciones => { io = funciones; },
    anotar: texto => spool?.texto.push(texto),
  };
})();

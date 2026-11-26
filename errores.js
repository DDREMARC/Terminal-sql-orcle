// Mensajes de error en español: Oracle real (por código) y simulador (por mensaje).
(() => {
  // Oracle XE 11g no trae los mensajes en español, así que se traducen por código
  const ORA = {
    900: 'sentencia SQL no válida', 904: 'identificador no válido (revisa el nombre de la columna o función)', 905: 'falta una palabra clave',
    906: 'falta el paréntesis izquierdo', 907: 'falta el paréntesis derecho', 909: 'número de argumentos no válido', 911: 'carácter no válido',
    913: 'demasiados valores', 917: 'falta una coma', 918: 'columna definida de forma ambigua (ponle el alias de la tabla)', 920: 'operador relacional no válido',
    921: 'comando SQL terminado de forma inesperada', 923: 'no se encontró la palabra FROM donde se esperaba', 925: 'falta la palabra INTO',
    928: 'falta la palabra SELECT', 933: 'comando SQL no terminado correctamente', 934: 'no se permite una función de grupo aquí (usa HAVING)',
    936: 'falta una expresión', 937: 'la función de grupo no es de grupo único (falta GROUP BY)', 938: 'no hay suficientes argumentos para la función',
    942: 'la tabla o vista no existe', 947: 'no hay suficientes valores', 972: 'el identificador es demasiado largo', 979: 'no es una expresión GROUP BY',
    1008: 'no se han enlazado todas las variables', 1400: 'no se puede insertar NULL', 1427: 'la subconsulta de una fila devuelve más de una fila',
    1476: 'el divisor es igual a cero', 1722: 'número no válido', 1756: 'falta cerrar una comilla', 1789: 'las consultas tienen distinto número de columnas',
    1790: 'las columnas deben tener el mismo tipo de dato', 1791: 'la expresión del ORDER BY no está en el SELECT', 1797: 'este operador debe ir seguido de ANY o ALL',
    1830: 'el formato de fecha no coincide con todo el texto', 1840: 'el valor de fecha es demasiado corto', 1841: 'año no válido', 1843: 'mes no válido',
    1847: 'día no válido para el mes', 1858: 'se encontró una letra donde se esperaba un número', 1861: 'el texto no coincide con el formato de fecha',
    4043: 'el objeto no existe', 1034: 'Oracle no está disponible (enciende la base de datos)', 12154: 'no se reconoce la cadena de conexión',
    12514: 'el listener no conoce el servicio pedido', 12541: 'no hay respuesta. Revisa que Apache y Oracle estén encendidos',
  };

  function oracle(mensaje) {
    return mensaje.replace(/ORA-(\d{5}):[^\n]*/g, (linea, codigo) => {
      const texto = ORA[Number(codigo)];
      if (!texto) return `ORA-${codigo}: error de Oracle (busca este código para ver el detalle)`;
      const nombre = /^ORA-\d{5}:\s*("[^:]*"):/.exec(linea)?.[1];
      return `ORA-${codigo}: ${nombre ? nombre + ': ' : ''}${texto}`;
    });
  }

  // [mensaje de PostgreSQL, código Oracle, texto en español]
  const SIM = [
    [/^relation "(.+)" does not exist/, 942, n => `la tabla o vista "${n}" no existe`],
    [/^table "(.+)" does not exist/, 942, n => `la tabla "${n}" no existe`],
    [/^view "(.+)" does not exist/, 942, n => `la vista "${n}" no existe`],
    [/^sequence "(.+)" does not exist/, 2289, n => `la secuencia "${n}" no existe`],
    [/^index "(.+)" does not exist/, 1418, n => `el índice "${n}" no existe`],
    [/^column "(.+)" of relation "(.+)" already exists/, 1430, (c, t) => `la columna "${c}" ya existe en "${t}"`],
    [/^column "(.+)" of relation "(.+)" does not exist/, 904, (c, t) => `la columna "${c}" no existe en "${t}"`],
    [/^column "?(.+?)"? does not exist/, 904, c => `identificador no válido: la columna "${c}" no existe`],
    [/^missing FROM-clause entry for table "(.+)"/, 904, t => `el alias o tabla "${t}" no está en el FROM`],
    [/^syntax error at end of input/, 936, () => 'la sentencia está incompleta'],
    [/^syntax error at or near "(.+)"/, 933, x => `error de sintaxis cerca de "${x}"`],
    [/^unterminated quoted/, 1756, () => 'falta cerrar una comilla'],
    [/^function (.+) does not exist/, 904, f => `la función ${f.split('(')[0].toUpperCase()} no existe o sus argumentos no son del tipo correcto`],
    [/^operator does not exist/, 932, () => 'tipos de datos incompatibles en la comparación u operación'],
    [/^column reference "(.+)" is ambiguous/, 918, c => `la columna "${c}" es ambigua (ponle el alias de la tabla)`],
    [/^column "(.+)" must appear in the GROUP BY/, 979, c => `no es una expresión GROUP BY: falta "${c}" en el GROUP BY`],
    [/^aggregate function calls cannot be nested/, 935, () => 'funciones de grupo anidadas no admitidas en esta posición'],
    [/^aggregate functions are not allowed in/, 934, () => 'no se permite una función de grupo aquí (usa HAVING)'],
    [/^division by zero/, 1476, () => 'el divisor es igual a cero'],
    [/^duplicate key value violates unique constraint "(.+)"/, 1, c => `restricción única violada (${c})`],
    [/^null value in column "(.+?)"/, 1400, c => `no se puede insertar NULL en la columna "${c}"`],
    [/violates check constraint "(.+)"/, 2290, c => `restricción de control violada (${c})`],
    [/^check constraint "(.+?)" .*is violated/, 2293, c => `hay filas que no cumplen la restricción ${c}`],
    [/^update or delete on table .* violates foreign key constraint "(.+?)"/, 2292, c => `restricción de integridad violada (${c}): hay registros secundarios que dependen de esta fila`],
    [/violates foreign key constraint "(.+?)"/, 2291, c => `restricción de integridad violada (${c}): no existe la clave principal`],
    [/^value too long for type character(?: varying)?\((\d+)\)/, 12899, n => `valor demasiado grande para la columna (máximo ${n})`],
    [/^numeric field overflow/, 1438, () => 'valor mayor que la precisión permitida en la columna'],
    [/^relation "(.+)" already exists/, 955, n => `el nombre "${n}" ya lo está usando otro objeto`],
    [/^constraint "(.+?)" .*already exists/, 2264, c => `el nombre de restricción "${c}" ya existe`],
    [/^constraint "(.+?)" .*does not exist/, 2443, c => `la restricción "${c}" no existe`],
    [/because other objects depend on it/, 2449, () => 'otros objetos dependen de este (usa CASCADE CONSTRAINTS si de verdad quieres borrarlo)'],
    [/^more than one row returned by a subquery/, 1427, () => 'la subconsulta de una fila devuelve más de una fila'],
    [/^subquery has too many columns/, 913, () => 'la subconsulta devuelve demasiadas columnas'],
    [/^INSERT has more expressions than target columns/, 913, () => 'demasiados valores'],
    [/^INSERT has more target columns than expressions/, 947, () => 'no hay suficientes valores'],
    [/^each .+ query must have the same number of columns/, 1789, () => 'las consultas tienen distinto número de columnas'],
    [/types .+ cannot be matched/, 1790, () => 'las columnas deben tener el mismo tipo de dato'],
    [/^for SELECT DISTINCT, ORDER BY/, 1791, () => 'la expresión del ORDER BY no está en el SELECT'],
    [/^invalid input syntax for type (?:numeric|integer)/, 1722, () => 'número no válido'],
    [/^(?:invalid input syntax for type (?:date|timestamp)|date\/time field value out of range|invalid value .+ for)/, 1861, () => 'fecha no válida o no coincide con el formato'],
    [/^column "(.+)" is of type/, 932, c => `el tipo de dato no sirve para la columna "${c}"`],
    [/^column "(.+)" specified more than once/, 957, c => `la columna "${c}" está repetida`],
    [/^(?:no such savepoint|savepoint .+ does not exist)/, 1086, () => 'no se ha establecido ese punto de salvaguarda'],
    // PL/SQL
    [/^query returned no rows/, 1403, () => 'no se han encontrado datos'],
    [/^query returned more than one row/, 1422, () => 'la recuperación exacta devuelve más filas de las solicitadas'],
    [/^null value cannot be assigned to variable "(.+?)"/, 6502, v => `no se puede asignar NULL a la variable "${v}" (es NOT NULL)`],
    [/^variable "(.+?)" is declared CONSTANT/, 6550, v => `PLS-00363: la constante "${v}" no se puede modificar`],
    [/^variable "(.+?)" must have a default value/, 6550, v => `PLS-00218: la variable "${v}" es NOT NULL y debe inicializarse`],
    [/^"(.+?)" is not a known variable/, 6550, v => `PLS-00201: el identificador "${v}" no está declarado`],
    [/^missing (.+?) at/, 6550, x => `PLS-00103: falta ${x} en el bloque`],
  ];

  function simulador(e) {
    if (/^(ORA|SP2|PLS)-/.test(e.message)) return e.message;
    for (const [patron, codigo, texto] of SIM) {
      const m = patron.exec(e.message);
      if (m) return `ORA-${String(codigo).padStart(5, '0')}: ${texto(...m.slice(1))}`;
    }
    return 'ORA-00900: no se pudo ejecutar la sentencia (revisa la sintaxis)';
  }

  window.ERRORES = { oracle, simulador };
})();

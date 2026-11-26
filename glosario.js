// Glosario del curso de Bases de Datos: [semana, término, definición, ejemplo]
(() => {
  const T = [
    [1, 'Base de datos', 'Colección de datos guardados en un soporte informático permanente.'],
    [1, 'SGBD', 'Software para administrar, configurar y consultar una base de datos.'],
    [1, 'DBA', 'Administrador de la base de datos.'],
    [1, 'Tabla', 'Unidad básica de almacenamiento, hecha de filas y columnas.'],
    [1, 'SELECT', 'Recupera datos. Permite selección (filas), proyección (columnas) y unión.', 'SELECT nombre, precio FROM menu_platos;'],
    [1, 'WHERE', 'Filtra filas.', 'WHERE precio > 20'],
    [1, 'DISTINCT', 'Quita filas repetidas.', 'SELECT DISTINCT categoria FROM menu_platos;'],
    [1, 'Alias', 'Nombre temporal para una columna o tabla.', 'SELECT sueldo AS pago FROM empleados e;'],
    [1, 'NULL', 'Valor desconocido. No es cero ni espacio. Se compara con IS NULL.', 'WHERE mesa_id IS NULL'],
    [1, 'Concatenación', 'Une textos con ||.', "nombre || ' - ' || cargo"],
    [1, 'LIKE', 'Busca patrones: % es cualquier texto, _ un solo carácter.', "WHERE nombre LIKE '%Saltado%'"],
    [1, 'BETWEEN / IN', 'Rango de valores / lista de valores.', 'precio BETWEEN 20 AND 30'],
    [1, 'ORDER BY', 'Ordena el resultado: ASC o DESC.', 'ORDER BY precio DESC'],
    [2, 'Función de fila', 'Devuelve un resultado por cada fila.'],
    [2, 'UPPER / LOWER / INITCAP', 'Mayúsculas, minúsculas o inicial en mayúscula.', 'UPPER(nombre)'],
    [2, 'SUBSTR', 'Saca una parte del texto (desde, cantidad).', 'SUBSTR(dni, 1, 4)'],
    [2, 'INSTR', 'Posición de un texto dentro de otro.', "INSTR(email, '@')"],
    [2, 'LENGTH', 'Cantidad de caracteres.', 'LENGTH(nombre)'],
    [2, 'LPAD / RPAD', 'Rellena a la izquierda o derecha.', "LPAD(codigo, 8, '*')"],
    [2, 'REPLACE', 'Cambia un texto por otro.', "REPLACE(codigo, 'CHI', 'TIO')"],
    [2, 'ROUND / TRUNC', 'Redondea / corta decimales.', 'ROUND(precio / 3, 2)'],
    [2, 'MOD', 'Resto de una división.', 'MOD(sueldo, 1000)'],
    [3, 'TO_CHAR', 'Número o fecha a texto.', "TO_CHAR(fecha, 'DD/MM/YYYY')"],
    [3, 'TO_DATE / TO_NUMBER', 'Texto a fecha / a número.', "TO_DATE('01/11/2026', 'DD/MM/YYYY')"],
    [3, 'NVL', 'Si el valor es NULL, usa otro.', 'NVL(mesa_id, 0)'],
    [3, 'NVL2', 'Un valor si no es NULL y otro si lo es.', "NVL2(mesa_id, 'Mesa', 'Sin mesa')"],
    [3, 'NULLIF', 'Devuelve NULL si los dos valores son iguales.', 'NULLIF(cantidad, 1)'],
    [3, 'COALESCE', 'Primer valor no NULL de una lista.', 'COALESCE(mesa_id, empleado_id, 0)'],
    [3, 'CASE', 'Condiciones tipo si / si no.', "CASE WHEN precio < 10 THEN 'Barato' ELSE 'Normal' END"],
    [3, 'DECODE', 'Compara un valor y devuelve según coincida.', "DECODE(disponible, 'S', 'Si', 'No')"],
    [4, 'Función de grupo', 'Un resultado por grupo: COUNT, SUM, AVG, MIN, MAX, STDDEV, VARIANCE.', 'AVG(precio)'],
    [4, 'GROUP BY', 'Agrupa filas.', 'GROUP BY categoria'],
    [4, 'HAVING', 'Filtra grupos. WHERE filtra filas antes de agrupar.', 'HAVING COUNT(*) > 2'],
    [4, 'COUNT', 'COUNT(*) cuenta filas; COUNT(columna) solo las no nulas.', 'COUNT(DISTINCT categoria)'],
    [5, 'Subconsulta', 'Consulta dentro de otra.', 'precio > (SELECT AVG(precio) FROM menu_platos)'],
    [5, 'Subconsulta correlacionada', 'Usa un dato de la fila de la consulta de afuera.', 'WHERE x.categoria = m.categoria'],
    [5, 'IN / ANY / ALL', 'Para subconsultas de varias filas.', 'precio > ALL (SELECT ...)'],
    [5, 'EXISTS', 'Verdadero si la subconsulta devuelve filas.', 'WHERE NOT EXISTS (SELECT 1 FROM pagos ...)'],
    [6, 'JOIN ... ON', 'Une tablas con una condición.', 'JOIN pedidos p ON p.cliente_id = c.id'],
    [6, 'USING / NATURAL JOIN', 'Une por una columna / por todas las columnas del mismo nombre.', 'JOIN pagos USING (pedido_id)'],
    [6, 'LEFT / RIGHT / FULL JOIN', 'Muestra también filas sin pareja (izquierda, derecha o ambas).'],
    [6, 'Autounión', 'Una tabla unida consigo misma usando alias.'],
    [6, 'Unión no igualitaria', 'La condición usa BETWEEN, < o > en vez de =.'],
    [6, 'CROSS JOIN', 'Producto cartesiano: todas las filas contra todas.'],
    [7, 'DML', 'Manipula datos: INSERT, UPDATE, DELETE.', "UPDATE menu_platos SET precio = 10 WHERE id = 8;"],
    [7, 'Transacción', 'Grupo de sentencias DML que forman una unidad de trabajo.'],
    [7, 'COMMIT / ROLLBACK', 'Guarda / deshace los cambios.'],
    [7, 'SAVEPOINT', 'Punto intermedio al que se puede volver.', 'ROLLBACK TO SAVEPOINT a;'],
    [8, 'DDL', 'Define objetos: CREATE, ALTER, DROP, TRUNCATE.'],
    [8, 'Restricción (constraint)', 'Regla de la tabla: NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK.'],
    [9, 'Vista', 'Consulta guardada que se usa como tabla.', 'CREATE VIEW v AS SELECT ...'],
    [9, 'Secuencia', 'Genera números únicos con NEXTVAL y CURRVAL.', 'seq_x.NEXTVAL'],
    [9, 'Índice', 'Acelera algunas consultas.', 'CREATE INDEX idx ON clientes (nombre);'],
    [9, 'Sinónimo', 'Nombre alternativo para un objeto.'],
    [10, 'ALTER TABLE', 'Agrega, modifica o borra columnas y restricciones.', 'ALTER TABLE mesas ADD (nota VARCHAR2(40));'],
    [11, 'MER', 'Modelo entidad-relación: vista lógica de entidades, atributos y relaciones.'],
    [13, 'DER', 'Diagrama entidad-relación: vista física con tablas, columnas, llaves y restricciones.'],
    [13, 'Llave primaria (PK)', 'Identifica de forma única cada fila. Puede ser simple o compuesta.'],
    [13, 'Llave foránea (FK)', 'Columna que apunta a la llave primaria de otra tabla.'],
    [13, 'Cardinalidad', 'Tipo de relación: 1-1, 1-n o n-n.'],
    [14, 'PL/SQL', 'Lenguaje de Oracle que agrega programación a SQL.'],
    [14, '%TYPE', 'Declara una variable con el mismo tipo de una columna.', 'v_nombre clientes.nombre%TYPE;'],
    [14, 'Bind variable', 'Variable del entorno que se usa con dos puntos.', 'VARIABLE b_sueldo NUMBER'],
    [15, 'Normalización', 'Organizar tablas para evitar redundancia y anomalías.'],
    [15, '1FN', 'Valores atómicos, sin grupos repetidos, con llave primaria.'],
    [15, '2FN', 'Está en 1FN y todo atributo depende de toda la llave primaria.'],
    [15, '3FN', 'Está en 2FN y no hay dependencias entre atributos que no son llave.'],
  ];

  const limpiar = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ficha = ([, termino, def, ej]) => `${termino}\n  ${def}${ej ? `\n  Ej: ${ej}` : ''}`;

  // glosario            -> todo, por semana
  // glosario <palabra>  -> busca; glosario semana 3 -> esa semana
  window.GLOSARIO = busqueda => {
    const q = limpiar(busqueda.trim());
    const semana = /^semana\s+(\d+)$/.exec(q);
    let lista = T;
    if (semana) lista = T.filter(t => t[0] === Number(semana[1]));
    else if (q) {
      const enTermino = T.filter(t => limpiar(t[1]).includes(q));
      lista = enTermino.length ? enTermino : T.filter(t => limpiar(t[2]).includes(q));
    }
    if (!lista.length) return `\nNo encontré "${busqueda.trim()}" en el glosario.\n`;
    return lista.map((t, i) => `${t[0] !== lista[i - 1]?.[0] ? `\n== Semana ${t[0]} ==\n` : ''}${ficha(t)}`).join('\n') + '\n';
  };
})();

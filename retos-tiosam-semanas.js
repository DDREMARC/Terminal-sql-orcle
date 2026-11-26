// Completa los temas de las semanas 1 a 6 sobre las tablas del Tío Sam.
const SEMANAS = { 0: 'Exposición (guion)', 1: 'SELECT', 2: 'Funciones de fila', 3: 'Conversión y condicionales', 4: 'Funciones de grupo', 5: 'Subconsultas', 6: 'JOIN' };

// Semana de cada reto de retos-tiosam.js, en el mismo orden
[0,0,0,0, 4,5,5,6,5,6,2,3,5,4,5,5,3,5].forEach((s, i) => RETOS[i].sem = s);

const reto = (sem, titulo, tema, orden, texto, columnas, pista, sql) => RETOS.push({ sem, titulo, tema, orden, texto, columnas, pista, sql });

reto(1, "Estados usados", "DISTINCT + ORDER BY", true,
  "Combinaciones distintas de modalidad y estado que aparecen en pedidos. Ordena por modalidad y estado.",
  "modalidad, estado", "DISTINCT va justo después de SELECT.",
`SELECT DISTINCT modalidad, estado FROM pedidos ORDER BY modalidad, estado`);

reto(1, "Frase de la carta", "Concatenación + q'[ ]'", false,
  "Para los 'Platos Mixtos', una sola columna con este formato: Chef's choice: Aeropuerto (S/ 27)",
  "detalle", "q'[Chef's choice: ]' || nombre || ' (S/ ' || precio || ')'",
`SELECT q'[Chef's choice: ]' || nombre || ' (S/ ' || precio || ')' AS detalle
FROM menu_platos
WHERE categoria = 'Platos Mixtos'`);

reto(1, "Precio con IGV", "Expresiones + LIKE", true,
  "Platos cuyo nombre contiene 'Arroz': nombre, precio y precio con 18% más. Ordena por nombre.",
  "nombre, precio, con_igv", "LIKE '%Arroz%' y precio * 1.18",
`SELECT nombre, precio, precio * 1.18 AS con_igv
FROM menu_platos
WHERE nombre LIKE '%Arroz%'
ORDER BY nombre`);

reto(2, "Formato de clientes", "UPPER + LPAD + LENGTH", false,
  "De cada cliente: nombre en mayúsculas, código rellenado con * a la izquierda hasta 8 caracteres y largo del nombre.",
  "nombre, codigo, largo", "UPPER, LPAD(codigo, 8, '*'), LENGTH",
`SELECT UPPER(nombre) AS nombre, LPAD(codigo, 8, '*') AS codigo, LENGTH(nombre) AS largo
FROM clientes`);

reto(2, "Código nuevo", "REPLACE + SUBSTR + INSTR", false,
  "De cada plato: nombre, código cambiando 'CHI-' por 'TIO-', y lo que va después del guion.",
  "nombre, nuevo, numero", "SUBSTR(codigo, INSTR(codigo, '-') + 1)",
`SELECT nombre, REPLACE(codigo, 'CHI-', 'TIO-') AS nuevo, SUBSTR(codigo, INSTR(codigo, '-') + 1) AS numero
FROM menu_platos`);

reto(2, "Redondeos y restos", "ROUND + TRUNC + MOD", false,
  "Empleados: sueldo diario (sueldo/30) redondeado a 2 decimales, el mismo truncado a entero y el resto de sueldo entre 1000.",
  "nombre, redondeado, truncado, resto", "ROUND(x, 2), TRUNC(x), MOD(sueldo, 1000)",
`SELECT nombre, ROUND(sueldo / 30, 2) AS redondeado, TRUNC(sueldo / 30) AS truncado, MOD(sueldo, 1000) AS resto
FROM empleados`);

reto(2, "Fechas de empleados", "ADD_MONTHS + LAST_DAY + MONTHS_BETWEEN", false,
  "Empleados: fecha de revisión (6 meses después de ingresar), último día del mes de ingreso y meses completos hasta el 31/12/2027.",
  "nombre, revision, fin_mes, meses", "TRUNC(MONTHS_BETWEEN(TO_DATE('31/12/2027','DD/MM/YYYY'), fecha_ingreso))",
`SELECT nombre, ADD_MONTHS(fecha_ingreso, 6) AS revision, LAST_DAY(fecha_ingreso) AS fin_mes,
       TRUNC(MONTHS_BETWEEN(TO_DATE('31/12/2027','DD/MM/YYYY'), fecha_ingreso)) AS meses
FROM empleados`);

reto(3, "Dinero y fecha", "TO_CHAR de número y fecha", false,
  "De cada pago: id, monto como S/ 56.00 (usa fm99990.00) y fecha como DD-MM-YYYY.",
  "id, monto, fecha", "'S/ ' || TO_CHAR(monto, 'fm99990.00')",
`SELECT id, 'S/ ' || TO_CHAR(monto, 'fm99990.00') AS monto, TO_CHAR(fecha, 'DD-MM-YYYY') AS fecha
FROM pagos`);

reto(3, "Mesa o no", "NVL2 + COALESCE", false,
  "De cada pedido: 'EN MESA' o 'SIN MESA', y el primer valor no nulo entre mesa_id y 0.",
  "id, tipo, mesa", "NVL2(mesa_id, ..., ...) y COALESCE(mesa_id, 0)",
`SELECT id, NVL2(mesa_id, 'EN MESA', 'SIN MESA') AS tipo, COALESCE(mesa_id, 0) AS mesa
FROM pedidos`);

reto(3, "Cantidad distinta de dos", "NULLIF + TO_NUMBER", false,
  "Líneas del detalle con pedido_id menor que el texto '4' convertido a número: id, cantidad y NULLIF(cantidad, 1).",
  "id, cantidad, resultado", "WHERE pedido_id < TO_NUMBER('4')",
`SELECT id, cantidad, NULLIF(cantidad, 1) AS resultado
FROM detalle_pedido
WHERE pedido_id < TO_NUMBER('4')`);

reto(4, "Estadísticas de la carta", "COUNT DISTINCT + STDDEV + VARIANCE", false,
  "De menu_platos: total de platos, categorías distintas, desviación estándar y varianza del precio (ambas a 2 decimales).",
  "total, categorias, desviacion, varianza", "COUNT(DISTINCT categoria)",
`SELECT COUNT(*) AS total, COUNT(DISTINCT categoria) AS categorias,
       ROUND(STDDEV(precio), 2) AS desviacion, ROUND(VARIANCE(precio), 2) AS varianza
FROM menu_platos`);

reto(4, "Promedio con nulos", "AVG con NVL + COUNT(columna)", false,
  "De pedidos: total, cuántos tienen mesa, promedio de mesa_id solo con valor y promedio contando los nulos como 0 (2 decimales).",
  "total, con_mesa, solo_con, todos", "COUNT(mesa_id) ignora NULL. AVG(NVL(mesa_id, 0))",
`SELECT COUNT(*) AS total, COUNT(mesa_id) AS con_mesa,
       ROUND(AVG(mesa_id), 2) AS solo_con, ROUND(AVG(NVL(mesa_id, 0)), 2) AS todos
FROM pedidos`);

reto(5, "Menor que algún mixto", "ANY", false,
  "Platos que no son 'Platos Mixtos' y cuestan menos que ALGÚN plato mixto.",
  "nombre, categoria, precio", "precio < ANY (subconsulta)",
`SELECT nombre, categoria, precio
FROM menu_platos
WHERE precio < ANY (SELECT precio FROM menu_platos WHERE categoria = 'Platos Mixtos')
  AND categoria <> 'Platos Mixtos'`);

reto(5, "Categorías sobre guarniciones", "HAVING con subconsulta", false,
  "Categorías cuyo precio mínimo es mayor que el precio máximo de 'Guarniciones'.",
  "categoria, minimo", "HAVING MIN(precio) > (SELECT MAX(precio) ...)",
`SELECT categoria, MIN(precio) AS minimo
FROM menu_platos
GROUP BY categoria
HAVING MIN(precio) > (SELECT MAX(precio) FROM menu_platos WHERE categoria = 'Guarniciones')`);

reto(6, "Platos pareja", "Autounión", false,
  "Pares de platos de la misma categoría donde el primero cuesta más que el segundo, solo en 'Platos Mixtos' y 'Platos Comunes'.",
  "caro, barato, categoria", "a.categoria = b.categoria AND a.precio > b.precio",
`SELECT a.nombre AS caro, b.nombre AS barato, a.categoria
FROM menu_platos a
JOIN menu_platos b ON a.categoria = b.categoria AND a.precio > b.precio
WHERE a.categoria IN ('Platos Mixtos', 'Platos Comunes')`);

reto(6, "Rango de precio", "JOIN no igualitario", false,
  "Clasifica cada plato uniéndolo con esta lista: 'Economico' de 0 a 10 y 'Fuerte' de 20 a 40. Solo salen los que caen en un rango.",
  "nombre, precio, rango", "Crea los rangos con SELECT ... FROM dual UNION ALL y une con BETWEEN.",
`SELECT m.nombre, m.precio, r.rango
FROM menu_platos m
JOIN (SELECT 'Economico' AS rango, 0 AS desde, 10 AS hasta FROM dual
      UNION ALL SELECT 'Fuerte', 20, 40 FROM dual) r
  ON m.precio BETWEEN r.desde AND r.hasta`);

reto(6, "Unión con USING", "JOIN ... USING", false,
  "Con USING (pedido_id): pedido_id, método de pago, plato_id y cantidad.",
  "pedido_id, metodo, plato_id, cantidad", "La columna de USING va sin alias.",
`SELECT pedido_id, g.metodo, d.plato_id, d.cantidad
FROM pagos g
JOIN detalle_pedido d USING (pedido_id)`);

reto(6, "Unión natural", "NATURAL JOIN", false,
  "Con NATURAL JOIN une (id como pedido_id, modalidad de pedidos) con (pedido_id, metodo de pagos).",
  "pedido_id, modalidad, metodo", "Usa dos subconsultas en el FROM: NATURAL JOIN une por el nombre común.",
`SELECT pedido_id, modalidad, metodo
FROM (SELECT id AS pedido_id, modalidad FROM pedidos)
NATURAL JOIN (SELECT pedido_id, metodo FROM pagos)`);

reto(6, "Todas las mesas", "RIGHT OUTER JOIN", true,
  "Con RIGHT JOIN: cantidad de pedidos de cada mesa, incluso las que tienen 0. Ordena por número.",
  "numero, pedidos", "COUNT(p.id), no COUNT(*).",
`SELECT m.numero, COUNT(p.id) AS pedidos
FROM pedidos p
RIGHT JOIN mesas m ON m.id = p.mesa_id
GROUP BY m.numero
ORDER BY m.numero`);

reto(6, "Pedidos y pagos completos", "FULL OUTER JOIN", false,
  "Une pedidos y pagos mostrando todo de ambos lados: id del pedido, estado del pedido y monto.",
  "pedido, estado, monto", "FULL OUTER JOIN pagos g ON g.pedido_id = p.id",
`SELECT p.id AS pedido, p.estado, g.monto
FROM pedidos p
FULL OUTER JOIN pagos g ON g.pedido_id = p.id`);

reto(6, "Todas las combinaciones", "CROSS JOIN", false,
  "Cruza las mesas de la 'Terraza' o 'Salón' con los empleados 'Mozo' o 'Cajero'.",
  "numero, nombre", "CROSS JOIN y filtra en WHERE.",
`SELECT m.numero, e.nombre
FROM mesas m CROSS JOIN empleados e
WHERE m.zona IN ('Terraza', 'Salón') AND e.cargo IN ('Mozo', 'Cajero')`);

RETOS.sort((a, b) => a.sem - b.sem);
RETOS.forEach(x => x.tema = `${x.sem ? 'S' + x.sem : 'Expo'} · ${x.tema}`);

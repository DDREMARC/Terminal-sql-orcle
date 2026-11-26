// Retos de dificultad media. Solo temas de las semanas 1 a 6.
// orden: true => el orden de las filas también se revisa.
const RETOS = [
  // Las 4 consultas en vivo sugeridas en el guion de la exposición
  { titulo: "Expo Q2: precios 20 a 30", tema: "BETWEEN + ORDER BY", orden: true,
    texto: "Platos con precio entre S/ 20 y S/ 30, del más caro al más barato.",
    columnas: "codigo, nombre, precio",
    pista: "WHERE precio BETWEEN ... AND ...  y  ORDER BY ... DESC",
    sql: `SELECT codigo, nombre, precio
FROM menu_platos
WHERE precio BETWEEN 20 AND 30
ORDER BY precio DESC` },

  { titulo: "Expo Q11: total por pedido", tema: "JOIN + SUM + GROUP BY", orden: true,
    texto: "Total de cada pedido calculado desde el detalle, con el nombre del cliente. Mayor total primero.",
    columnas: "pedido, cliente, total",
    pista: "SUM(d.cantidad * d.precio_unitario) y GROUP BY p.id, c.nombre",
    sql: `SELECT p.id AS pedido, c.nombre AS cliente, SUM(d.cantidad * d.precio_unitario) AS total
FROM pedidos p
JOIN detalle_pedido d ON d.pedido_id = p.id
JOIN clientes c ON c.id = p.cliente_id
GROUP BY p.id, c.nombre
ORDER BY total DESC` },

  { titulo: "Expo Q13: platos nunca pedidos", tema: "LEFT JOIN + IS NULL", orden: true,
    texto: "Platos de la carta que nunca se han pedido, ordenados por código.",
    columnas: "codigo, nombre",
    pista: "LEFT JOIN con detalle_pedido y WHERE d.id IS NULL",
    sql: `SELECT m.codigo, m.nombre
FROM menu_platos m
LEFT JOIN detalle_pedido d ON d.plato_id = m.id
WHERE d.id IS NULL
ORDER BY m.codigo` },

  { titulo: "Expo Q20: cobrado por método", tema: "WHERE + GROUP BY", orden: true,
    texto: "Cantidad de pagos y dinero cobrado por método de pago, solo pagos con estado 'Pagado'. Mayor cobro primero.",
    columnas: "metodo, pagos, total_cobrado",
    pista: "COUNT(*) y SUM(monto). El estado se filtra en WHERE, antes de agrupar.",
    sql: `SELECT metodo, COUNT(*) AS pagos, SUM(monto) AS total_cobrado
FROM pagos
WHERE estado = 'Pagado'
GROUP BY metodo
ORDER BY total_cobrado DESC` },

  { titulo: "Buenos pagadores", tema: "JOIN + GROUP BY + HAVING", orden: true,
    texto: "Clientes cuyos pagos con estado 'Pagado' suman más de S/ 30. Ordena del que más pagó al que menos.",
    columnas: "nombre, total_pagado",
    pista: "pagos no tiene cliente_id: pasa por pedidos. El filtro de la suma va en HAVING.",
    sql: `SELECT c.nombre, SUM(g.monto) AS total_pagado
FROM pagos g
JOIN pedidos p ON p.id = g.pedido_id
JOIN clientes c ON c.id = p.cliente_id
WHERE g.estado = 'Pagado'
GROUP BY c.nombre
HAVING SUM(g.monto) > 30
ORDER BY total_pagado DESC` },

  { titulo: "Caro en su categoría", tema: "Subconsulta correlacionada", orden: false,
    texto: "Platos que cuestan más que el promedio de SU propia categoría.",
    columnas: "nombre, categoria, precio",
    pista: "La subconsulta usa la categoría de la fila de afuera: usa dos alias de menu_platos.",
    sql: `SELECT m.nombre, m.categoria, m.precio
FROM menu_platos m
WHERE m.precio > (SELECT AVG(x.precio) FROM menu_platos x WHERE x.categoria = m.categoria)` },

  { titulo: "Sin pedidos vigentes", tema: "NOT IN / NOT EXISTS", orden: false,
    texto: "Platos que no aparecen en ningún pedido vigente (vigente = estado distinto de 'Cancelado').",
    columnas: "codigo, nombre",
    pista: "Primero saca los plato_id de pedidos no cancelados. Luego quédate con los que NO están.",
    sql: `SELECT codigo, nombre
FROM menu_platos
WHERE id NOT IN (SELECT d.plato_id
                 FROM detalle_pedido d
                 JOIN pedidos p ON p.id = d.pedido_id
                 WHERE p.estado <> 'Cancelado')` },

  { titulo: "Pedidos grandes", tema: "JOIN de 4 tablas", orden: true,
    texto: "Pedidos cuyo total (cantidad × precio_unitario) pasa de S/ 50, con quién compró y quién atendió. Mayor total primero.",
    columnas: "pedido, cliente, empleado, total",
    pista: "pedidos, clientes, empleados y detalle_pedido. Todo lo que no es SUM va en GROUP BY.",
    sql: `SELECT p.id AS pedido, c.nombre AS cliente, e.nombre AS empleado,
       SUM(d.cantidad * d.precio_unitario) AS total
FROM pedidos p
JOIN clientes c ON c.id = p.cliente_id
JOIN empleados e ON e.id = p.empleado_id
JOIN detalle_pedido d ON d.pedido_id = p.id
GROUP BY p.id, c.nombre, e.nombre
HAVING SUM(d.cantidad * d.precio_unitario) > 50
ORDER BY total DESC` },

  { titulo: "El pedido récord", tema: "Funciones de grupo anidadas", orden: false,
    texto: "El pedido con el total más alto. No escribas el número a mano.",
    columnas: "pedido_id, total",
    pista: "HAVING SUM(...) = (SELECT MAX(SUM(...)) FROM ... GROUP BY ...)",
    sql: `SELECT pedido_id, SUM(cantidad * precio_unitario) AS total
FROM detalle_pedido
GROUP BY pedido_id
HAVING SUM(cantidad * precio_unitario) =
       (SELECT MAX(SUM(cantidad * precio_unitario)) FROM detalle_pedido GROUP BY pedido_id)` },

  { titulo: "Todos los clientes", tema: "LEFT JOIN", orden: true,
    texto: "Cantidad de pedidos vigentes (no 'Cancelado') de CADA cliente, incluso los que tienen 0. Ordena por cantidad descendente y luego por nombre.",
    columnas: "nombre, vigentes",
    pista: "Si filtras el estado en WHERE pierdes los ceros. Ponlo en el ON.",
    sql: `SELECT c.nombre, COUNT(p.id) AS vigentes
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.estado <> 'Cancelado'
GROUP BY c.nombre
ORDER BY vigentes DESC, c.nombre` },

  { titulo: "Correos que no son Gmail", tema: "SUBSTR + INSTR", orden: false,
    texto: "Primer nombre en MAYÚSCULAS y dominio del correo (lo que va después de @) de los clientes que no usan gmail.com.",
    columnas: "primer_nombre, dominio",
    pista: "INSTR(nombre,' ') da la posición del primer espacio. INSTR(email,'@') la del arroba.",
    sql: `SELECT UPPER(SUBSTR(nombre, 1, INSTR(nombre, ' ') - 1)) AS primer_nombre,
       SUBSTR(email, INSTR(email, '@') + 1) AS dominio
FROM clientes
WHERE LOWER(email) NOT LIKE '%@gmail.com'` },

  { titulo: "Cancelados vs vigentes", tema: "CASE dentro de SUM", orden: true,
    texto: "Por cada empleado que atendió pedidos: cuántos están 'Cancelado' y cuántos no. Ordena por nombre.",
    columnas: "nombre, cancelados, vigentes",
    pista: "SUM(CASE WHEN condición THEN 1 ELSE 0 END)",
    sql: `SELECT e.nombre,
       SUM(CASE WHEN p.estado = 'Cancelado' THEN 1 ELSE 0 END) AS cancelados,
       SUM(CASE WHEN p.estado <> 'Cancelado' THEN 1 ELSE 0 END) AS vigentes
FROM empleados e
JOIN pedidos p ON p.empleado_id = e.id
GROUP BY e.nombre
ORDER BY e.nombre` },

  { titulo: "Mucho trabajo, menos sueldo", tema: "Dos subconsultas", orden: false,
    texto: "Empleados que ganan menos que el sueldo promedio y además atendieron 2 pedidos o más.",
    columnas: "nombre, cargo, sueldo",
    pista: "Una subconsulta para AVG y otra con IN + GROUP BY empleado_id + HAVING COUNT(*).",
    sql: `SELECT nombre, cargo, sueldo
FROM empleados
WHERE sueldo < (SELECT AVG(sueldo) FROM empleados)
  AND id IN (SELECT empleado_id FROM pedidos GROUP BY empleado_id HAVING COUNT(*) >= 2)` },

  { titulo: "Categorías que venden", tema: "JOIN + SUM + HAVING", orden: true,
    texto: "Categorías que suman más de S/ 40 en ventas (todos los pedidos). De mayor a menor.",
    columnas: "categoria, ventas",
    pista: "La categoría está en menu_platos y la cantidad en detalle_pedido.",
    sql: `SELECT m.categoria, SUM(d.cantidad * d.precio_unitario) AS ventas
FROM menu_platos m
JOIN detalle_pedido d ON d.plato_id = m.id
GROUP BY m.categoria
HAVING SUM(d.cantidad * d.precio_unitario) > 40
ORDER BY ventas DESC` },

  { titulo: "Falta cobrar", tema: "NOT EXISTS", orden: false,
    texto: "Pedidos que no tienen ningún registro en pagos, con el nombre del cliente.",
    columnas: "pedido, cliente, estado",
    pista: "NOT EXISTS (SELECT 1 FROM pagos ... WHERE pedido_id = el pedido de afuera)",
    sql: `SELECT p.id AS pedido, c.nombre AS cliente, p.estado
FROM pedidos p
JOIN clientes c ON c.id = p.cliente_id
WHERE NOT EXISTS (SELECT 1 FROM pagos g WHERE g.pedido_id = p.id)` },

  { titulo: "Más caro que toda guarnición", tema: "ALL + DECODE", orden: true,
    texto: "Platos más caros que TODAS las 'Guarniciones'. Muestra la disponibilidad como 'Si' o 'No'. Del más caro al más barato.",
    columnas: "nombre, precio, hay",
    pista: "precio > ALL (subconsulta) y DECODE(disponible, 'S', 'Si', 'No')",
    sql: `SELECT nombre, precio, DECODE(disponible, 'S', 'Si', 'No') AS hay
FROM menu_platos
WHERE precio > ALL (SELECT precio FROM menu_platos WHERE categoria = 'Guarniciones')
ORDER BY precio DESC` },

  { titulo: "¿En qué mesa?", tema: "LEFT JOIN + NVL", orden: true,
    texto: "Todos los pedidos con su número de mesa; si no tiene, muestra 'Sin mesa'. Ordena por pedido.",
    columnas: "pedido, modalidad, mesa",
    pista: "NVL necesita el mismo tipo: convierte el número con TO_CHAR.",
    sql: `SELECT p.id AS pedido, p.modalidad, NVL(TO_CHAR(m.numero), 'Sin mesa') AS mesa
FROM pedidos p
LEFT JOIN mesas m ON m.id = p.mesa_id
ORDER BY p.id` },

  { titulo: "Los más pedidos", tema: "Subconsulta en HAVING", orden: false,
    texto: "Platos cuyas unidades vendidas superan el promedio de unidades por plato.",
    columnas: "nombre, unidades",
    pista: "HAVING SUM(cantidad) > (SELECT AVG(SUM(cantidad)) FROM detalle_pedido GROUP BY plato_id)",
    sql: `SELECT m.nombre, SUM(d.cantidad) AS unidades
FROM menu_platos m
JOIN detalle_pedido d ON d.plato_id = m.id
GROUP BY m.nombre
HAVING SUM(d.cantidad) > (SELECT AVG(SUM(cantidad)) FROM detalle_pedido GROUP BY plato_id)` }
];

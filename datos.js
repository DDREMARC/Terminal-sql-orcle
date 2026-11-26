// Tablas y datos de ejemplo para el simulador (tomados de sql/tio_sam_oracle.sql)
window.DATOS_SQL = `
CREATE SEQUENCE seq_menu_platos;
CREATE TABLE menu_platos (
  id numeric DEFAULT nextval('seq_menu_platos'),
  codigo varchar(20),
  nombre varchar(100),
  descripcion varchar(500),
  categoria varchar(50),
  precio numeric,
  disponible char(1) DEFAULT 'S'
);
CREATE SEQUENCE seq_clientes;
CREATE TABLE clientes (
  id numeric DEFAULT nextval('seq_clientes'),
  codigo varchar(20),
  nombre varchar(100),
  dni varchar(8),
  telefono varchar(20),
  email varchar(100),
  direccion varchar(200)
);
CREATE SEQUENCE seq_empleados;
CREATE TABLE empleados (
  id numeric DEFAULT nextval('seq_empleados'),
  codigo varchar(20),
  nombre varchar(100),
  dni varchar(8),
  telefono varchar(20),
  cargo varchar(20),
  sueldo numeric,
  fecha_ingreso timestamp(0) DEFAULT LOCALTIMESTAMP(0),
  activo char(1) DEFAULT 'S'
);
CREATE SEQUENCE seq_usuarios;
CREATE TABLE usuarios (
  id numeric DEFAULT nextval('seq_usuarios'),
  usuario varchar(50),
  clave varchar(100),
  rol varchar(10),
  cliente_id numeric,
  empleado_id numeric,
  activo char(1) DEFAULT 'S'
);
CREATE SEQUENCE seq_mesas;
CREATE TABLE mesas (
  id numeric DEFAULT nextval('seq_mesas'),
  numero numeric,
  capacidad numeric,
  zona varchar(20),
  estado varchar(10) DEFAULT 'Libre'
);
CREATE SEQUENCE seq_pedidos;
CREATE TABLE pedidos (
  id numeric DEFAULT nextval('seq_pedidos'),
  cliente_id numeric,
  empleado_id numeric,
  mesa_id numeric,
  fecha timestamp(0) DEFAULT LOCALTIMESTAMP(0),
  modalidad varchar(15),
  estado varchar(15) DEFAULT 'Pendiente'
);
CREATE SEQUENCE seq_detalle_pedido;
CREATE TABLE detalle_pedido (
  id numeric DEFAULT nextval('seq_detalle_pedido'),
  pedido_id numeric,
  plato_id numeric,
  cantidad numeric,
  precio_unitario numeric
);
CREATE SEQUENCE seq_pagos;
CREATE TABLE pagos (
  id numeric DEFAULT nextval('seq_pagos'),
  pedido_id numeric,
  metodo varchar(15),
  monto numeric,
  fecha timestamp(0) DEFAULT LOCALTIMESTAMP(0),
  estado varchar(10) DEFAULT 'Pagado'
);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-001','Arroz Chaufa','Arroz salteado al wok con cerdo, huevo, cebolla china y sillao.','Platos Comunes',22);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-002','Lomo Saltado','Lomo fino salteado con cebolla, tomate y papas fritas.','Platos Comunes',26);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-003','Tallarín Saltado','Fideo saltado con verduras crocantes.','Platos Comunes',23);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-004','Chaufa Mixto','Chaufa con pollo, carne y camarones.','Platos Mixtos',29);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-005','Aeropuerto','Fusión de chaufa y tallarín saltado.','Platos Mixtos',27);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-006','Kam Lu Wantán','Wantanes crocantes en salsa agridulce.','Platos Mixtos',32);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-007','Wantán Frito','Seis unidades con salsa de tamarindo.','Guarniciones',12);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-008','Papas Fritas','Corte clásico, doradas y crocantes.','Guarniciones',9);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-009','Arroz Blanco','Porción adicional de arroz al vapor.','Guarniciones',6);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-010','Duraznos en Almíbar','El cierre dulce de todo chifa limeño.','Dulces',8);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-011','Helado de Lúcuma','Dos bolas de lúcuma con barquillo.','Dulces',10);
INSERT INTO menu_platos (codigo,nombre,descripcion,categoria,precio) VALUES ('CHI-012','Alfajor Chino','Galleta rellena de manjar blanco.','Dulces',6);
INSERT INTO clientes (codigo,nombre,dni,telefono,email,direccion) VALUES ('C-001','María Quispe Flores','45781236','987 654 321','maria.quispe@gmail.com','Av. Javier Prado 1234, San Borja');
INSERT INTO clientes (codigo,nombre,dni,telefono,email,direccion) VALUES ('C-002','Jorge Huamán Ríos','41230987','945 231 876','jorge.huaman@hotmail.com','Jr. de la Unión 456, Cercado de Lima');
INSERT INTO clientes (codigo,nombre,dni,telefono,email,direccion) VALUES ('C-003','Rosa Delgado Paredes','09873421','923 445 190','rosa.delgado@yahoo.es','Av. Arequipa 2150, Lince');
INSERT INTO clientes (codigo,nombre,dni,telefono,email,direccion) VALUES ('C-004','Carlos Mendoza Vera','47651209','976 118 342','carlos.mendoza@gmail.com','Av. Benavides 789, Miraflores');
INSERT INTO clientes (codigo,nombre,dni,telefono,email,direccion) VALUES ('C-005','Lucía Torres Campos','43329875','954 667 210','lucia.torres@outlook.com','Calle Los Nardos 145, Surco');
INSERT INTO empleados (codigo,nombre,dni,telefono,cargo,sueldo) VALUES ('E-001','Wilmer Chang Lau','40123456','987 111 222','Administrador',2500);
INSERT INTO empleados (codigo,nombre,dni,telefono,cargo,sueldo) VALUES ('E-002','Daniela Pérez Rojas','45678123','945 333 444','Mozo',1300);
INSERT INTO empleados (codigo,nombre,dni,telefono,cargo,sueldo) VALUES ('E-003','Kevin Huaman Soto','47890321','923 555 666','Cajero',1400);
INSERT INTO empleados (codigo,nombre,dni,telefono,cargo,sueldo) VALUES ('E-004','Li Wong Tang','09871234','976 777 888','Cocinero',2000);
INSERT INTO usuarios (usuario,clave,rol,empleado_id) VALUES ('admin','****','Empleado',1);
INSERT INTO usuarios (usuario,clave,rol,cliente_id)  VALUES ('maria.quispe','****','Cliente',1);
INSERT INTO usuarios (usuario,clave,rol,empleado_id) VALUES ('kevin.h','****','Empleado',3);
INSERT INTO mesas (numero,capacidad,zona,estado) VALUES (1,2,'Salón','Libre');
INSERT INTO mesas (numero,capacidad,zona,estado) VALUES (2,4,'Salón','Ocupada');
INSERT INTO mesas (numero,capacidad,zona,estado) VALUES (3,4,'Salón','Libre');
INSERT INTO mesas (numero,capacidad,zona,estado) VALUES (4,6,'Terraza','Reservada');
INSERT INTO mesas (numero,capacidad,zona,estado) VALUES (5,8,'Privado','Libre');
INSERT INTO pedidos (cliente_id,empleado_id,mesa_id,modalidad,estado) VALUES (1,2,3,'Mesa','Entregado');
INSERT INTO pedidos (cliente_id,empleado_id,mesa_id,modalidad,estado) VALUES (2,3,NULL,'Para llevar','Entregado');
INSERT INTO pedidos (cliente_id,empleado_id,mesa_id,modalidad,estado) VALUES (4,2,4,'Mesa','En cocina');
INSERT INTO pedidos (cliente_id,empleado_id,mesa_id,modalidad,estado) VALUES (5,3,NULL,'Para llevar','Pendiente');
INSERT INTO detalle_pedido (pedido_id,plato_id,cantidad,precio_unitario) VALUES (1,1,2,22);
INSERT INTO detalle_pedido (pedido_id,plato_id,cantidad,precio_unitario) VALUES (1,7,1,12);
INSERT INTO detalle_pedido (pedido_id,plato_id,cantidad,precio_unitario) VALUES (2,5,1,27);
INSERT INTO detalle_pedido (pedido_id,plato_id,cantidad,precio_unitario) VALUES (3,4,3,29);
INSERT INTO detalle_pedido (pedido_id,plato_id,cantidad,precio_unitario) VALUES (3,9,1,6);
INSERT INTO detalle_pedido (pedido_id,plato_id,cantidad,precio_unitario) VALUES (3,8,1,9);
INSERT INTO detalle_pedido (pedido_id,plato_id,cantidad,precio_unitario) VALUES (3,11,1,10);
INSERT INTO detalle_pedido (pedido_id,plato_id,cantidad,precio_unitario) VALUES (4,3,1,23);
INSERT INTO pagos (pedido_id,metodo,monto,estado) VALUES (1,'Efectivo',56,'Pagado');
INSERT INTO pagos (pedido_id,metodo,monto,estado) VALUES (2,'Yape/Plin',27,'Pagado');
INSERT INTO pagos (pedido_id,metodo,monto,estado) VALUES (3,'Tarjeta',112,'Pendiente');
`;

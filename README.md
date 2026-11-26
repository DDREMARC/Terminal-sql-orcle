# Terminal SQL Oracle (práctica)

Terminal en el navegador, estilo SQL*Plus, para practicar consultas sobre la base del chifa **El Tío Sam**.
Ejecuta las consultas en un Oracle real local. Solo permite `SELECT` y `DESC`, y solo desde la misma PC.

## Versión simulada (GitHub Pages)
Fuera de `localhost` la terminal **simula** Oracle en el navegador (PostgreSQL con PGlite y funciones tipo Oracle),
con datos de ejemplo (`datos.js`). No necesita instalar nada, solo internet. No es Oracle real:
los mensajes de error y algunos detalles pueden variar. Para probarla en local, agrega `?sim=1` a la dirección.

En modo simulado también funcionan `INSERT`, `UPDATE`, `DELETE`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `CREATE`, `ALTER`,
`DROP` y `TRUNCATE`. Lo confirmado queda guardado en tu navegador; `REINICIAR` vuelve a los datos originales.
También hay comandos de SQL*Plus (`/`, `LIST`, `EDIT`, `SET`, `COLUMN`, `&variable`, `VARIABLE`, `PRINT`, `SPOOL`, `@`),
`MERGE` y bloques PL/SQL básicos. No crea procedimientos, funciones, triggers ni paquetes, y no admite `ROWNUM`.
Con Oracle real la terminal es de solo lectura.

## Requisitos (solo para Oracle real)
- Oracle XE (probado en 11.2)
- XAMPP (Apache + PHP 8) con la extensión `oci8`
- Las 8 tablas del Tío Sam creadas: ver el repo [base-de-datos-final-semana16](https://github.com/DDREMARC/base-de-datos-final-semana16), carpeta `sql/`

## Instalar
1. Copia esta carpeta en `C:\xampp\htdocs\`.
2. Copia `config.example.php` como `config.php` y pon tu usuario y clave de Oracle.
3. Enciende Apache y Oracle.
4. Abre `http://localhost/Terminal-sql-orcle/`.

## Comandos
`AYUDA`, `RETOS`, `RETO 3`, `SEMANA 4`, `COMPROBAR`, `PISTA`, `SOLUCION`, `SIGUIENTE`, `TABLAS`, `DESC tabla`, `CLEAR`.

Los resultados de los retos dependen de los datos cargados en tu base.

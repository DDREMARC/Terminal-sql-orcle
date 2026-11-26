<?php
// Solo SELECT y DESC sobre las tablas del Tío Sam, solo desde esta PC.
header('Content-Type: application/json; charset=utf-8');

function salir($msg) { echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE); exit; }

$local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
$host  = preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $_SERVER['HTTP_HOST'] ?? '');
// La cabecera propia impide que otra web mande consultas desde tu navegador
if (!$local || !$host || $_SERVER['REQUEST_METHOD'] !== 'POST' || ($_SERVER['HTTP_X_PRACTICA'] ?? '') !== '1') {
    http_response_code(403);
    salir('Acceso no permitido.');
}

function conectar() {
    putenv('NLS_LANG=AMERICAN_AMERICA.AL32UTF8');
    $cfg = @include __DIR__ . '/config.php';
    if (!$cfg) salir('Falta config.php. Copia config.example.php y pon tus datos.');
    $con = @oci_connect($cfg['usuario'], $cfg['clave'], $cfg['cadena'], 'AL32UTF8');
    if (!$con) salir('No se pudo conectar a Oracle: ' . (oci_error()['message'] ?? '?'));
    oci_execute(oci_parse($con, "ALTER SESSION SET NLS_DATE_FORMAT = 'DD/MM/YYYY'"));
    return $con;
}

function leer($con, $sql, $vars = []) {
    $st = oci_parse($con, $sql);
    foreach ($vars as $k => $v) oci_bind_by_name($st, $k, $vars[$k]);
    if (!@oci_execute($st)) salir(oci_error($st)['message']);
    $filas = [];
    while ($f = oci_fetch_array($st, OCI_NUM + OCI_RETURN_NULLS)) $filas[] = $f;
    return $filas;
}

$entrada = json_decode(file_get_contents('php://input'), true);

if (!empty($entrada['esquema'])) {
    $con = conectar();
    $esquema = [];
    foreach (leer($con, 'SELECT table_name FROM user_tables ORDER BY table_name') as [$t]) {
        $n = leer($con, 'SELECT COUNT(*) FROM "' . $t . '"');
        $esquema[strtolower($t)] = ['filas' => (int)$n[0][0]];
    }
    echo json_encode($esquema);
    exit;
}

$sql = preg_replace('/[;\/\s]+$/', '', trim((string)($entrada['sql'] ?? '')));
$sql = preg_replace('/^(\s+|--[^\n]*(\n|$)|\/\*.*?\*\/)+/s', '', $sql);   // comentarios del inicio
$limpio = preg_replace('/--[^\n]*|\/\*.*?\*\//s', ' ', $sql);

if ($sql === '') salir('Escribe una consulta.');
if (preg_match('/^desc(ribe)?\s+(\w+)$/i', $sql, $m)) {
    $filas = leer(conectar(),
        "SELECT column_name, data_type || CASE
                  WHEN data_type LIKE '%CHAR%' THEN '(' || char_length || ')'
                  WHEN data_precision IS NOT NULL THEN '(' || data_precision || CASE WHEN data_scale > 0 THEN ',' || data_scale END || ')'
                END
         FROM user_tab_columns WHERE table_name = UPPER(:t) ORDER BY column_id", [':t' => $m[2]]);
    if (!$filas) salir("ORA-04043: el objeto {$m[2]} no existe");
    echo json_encode(['columnas' => ['NOMBRE', 'TIPO'], 'filas' => $filas, 'ms' => 0]);
    exit;
}
if (!preg_match('/^[\s(]*(select|with)\b/i', $sql)) salir('Esta práctica solo ejecuta SELECT y DESC.');
if (preg_match('/\bfor\s+update\b/i', $limpio)) salir('FOR UPDATE no está permitido aquí.');

$con = conectar();
$inicio = microtime(true);
$st = @oci_parse($con, $sql);
if (!$st) salir(oci_error($con)['message']);
if (oci_statement_type($st) !== 'SELECT') salir('Esta práctica solo ejecuta SELECT.');
if (!@oci_execute($st, OCI_NO_AUTO_COMMIT)) salir(oci_error($st)['message']);

$cols = [];
for ($i = 1; $i <= oci_num_fields($st); $i++) $cols[] = oci_field_name($st, $i);
$filas = [];
while (count($filas) < 200 && ($fila = oci_fetch_array($st, OCI_NUM + OCI_RETURN_NULLS + OCI_RETURN_LOBS)) !== false) {
    $filas[] = array_values($fila);
}
$e = oci_error($st);
oci_rollback($con);
if ($e) salir($e['message']);

echo json_encode(['columnas' => $cols, 'filas' => $filas, 'ms' => round((microtime(true) - $inicio) * 1000)], JSON_UNESCAPED_UNICODE);

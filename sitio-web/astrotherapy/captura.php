<?php
/**
 * captura.php — Recibe leads del formulario de la landing de AstroTherapy Pro
 * Guarda en leads.csv y envía notificación a Mario por email
 * Subir a: luzholistica.com.mx/astrotherapy/captura.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://luzholistica.com.mx');
header('Access-Control-Allow-Methods: POST');

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

// ─── Leer y sanitizar campos ──────────────────────────────────────────────────
$nombre   = trim(strip_tags($_POST['nombre']   ?? ''));
$email    = trim(strip_tags($_POST['email']    ?? ''));
$telefono = trim(strip_tags($_POST['telefono'] ?? ''));
$fuente   = 'landing_astrotherapy';
$fecha    = date('Y-m-d H:i:s');
$ip       = $_SERVER['REMOTE_ADDR'] ?? '';

// Validación
if (empty($nombre) || empty($email)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Nombre y correo son requeridos']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'El correo no es válido']);
    exit;
}

// ─── Guardar en CSV ───────────────────────────────────────────────────────────
$csvFile = __DIR__ . '/leads_privado/leads.csv';
$csvDir  = dirname($csvFile);

// Crear directorio si no existe
if (!is_dir($csvDir)) {
    mkdir($csvDir, 0750, true);
    // Proteger con .htaccess para que no sea accesible por web
    file_put_contents($csvDir . '/.htaccess', "Deny from all\n");
}

// Escribir encabezado si el archivo no existe
$isNew = !file_exists($csvFile);
$fh = fopen($csvFile, 'a');
if ($fh) {
    if ($isNew) {
        fputcsv($fh, ['fecha', 'nombre', 'email', 'telefono', 'fuente', 'ip']);
    }
    fputcsv($fh, [$fecha, $nombre, $email, $telefono, $fuente, $ip]);
    fclose($fh);
}

// ─── Enviar notificación a Mario ──────────────────────────────────────────────
$destino  = 'rivera.diaz.mario@gmail.com';
$asunto   = '🌟 Nuevo lead AstroTherapy Pro: ' . $nombre;

$cuerpo = "Nuevo lead registrado en la landing de AstroTherapy Pro\n\n"
    . "Nombre:    $nombre\n"
    . "Email:     $email\n"
    . "Teléfono:  " . ($telefono ?: '(no proporcionado)') . "\n"
    . "Fecha:     $fecha\n"
    . "Fuente:    $fuente\n\n"
    . "---\n"
    . "Responder directo a: $email\n";

$headers = implode("\r\n", [
    'From: AstroTherapy Pro <contacto@luzholistica.com.mx>',
    'Reply-To: ' . $nombre . ' <' . $email . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
]);

mail($destino, $asunto, $cuerpo, $headers);

// ─── Guardar en Supabase ──────────────────────────────────────────────────────
$supabase_url  = 'https://vfqaxzgyasbpfdrnfpuj.supabase.co';
$supabase_key  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcWF4emd5YXNicGZkcm5mcHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzk1MTUsImV4cCI6MjA5NjcxNTUxNX0.JOhqB-ADS1rwR5HFx4TTZO-PuL-E13XvsP9HkMu57vA';

$payload = json_encode([
    'nombre'  => $nombre,
    'email'   => $email,
    'telefono'=> $telefono ?: null,
    'origen'  => 'landing_astrotherapy',
    'interes' => 'AstroTherapy Pro',
]);

$ch = curl_init("$supabase_url/rest/v1/leads");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'apikey: ' . $supabase_key,
        'Authorization: Bearer ' . $supabase_key,
        'Prefer: return=minimal',
    ],
    CURLOPT_TIMEOUT        => 5,
]);
curl_exec($ch);
curl_close($ch);

// ─── Respuesta de éxito ───────────────────────────────────────────────────────
echo json_encode([
    'ok'      => true,
    'mensaje' => 'Lead registrado correctamente',
]);

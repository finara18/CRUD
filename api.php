<?php
/* ═══════════════════════════════════════════════════
   CRUD_DB · api.php
   Backend REST: Conecta MySQL y responde JSON
   Acciones: read | create | update | delete
═══════════════════════════════════════════════════ */

declare(strict_types=1);

/* ══════════════════════════════════════════════════
   CONFIGURACIÓN · Ajusta estos valores
══════════════════════════════════════════════════ */
define('DB_HOST', 'localhost');
define('DB_PORT', '33077');
define('DB_NAME', 'crud_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHAR', 'utf8mb4');

/* ══════════════════════════════════════════════════
   CABECERAS · CORS + JSON
══════════════════════════════════════════════════ */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */

/**
 * Enviar respuesta JSON y terminar ejecución.
 *
 * @param mixed $data    Datos a serializar
 * @param int   $status  Código HTTP
 */
function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Respuesta de error estandarizada.
 */
function respondError(string $message, int $status = 400): never
{
    respond(['ok' => false, 'message' => $message], $status);
}

/**
 * Leer y decodificar el body JSON de la petición.
 *
 * @return array<string, mixed>
 */
function getBody(): array
{
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Obtener un campo del body validando que no esté vacío.
 *
 * @param array<string, mixed> $body
 * @param string               $key
 * @param bool                 $required
 * @return mixed
 */
function field(array $body, string $key, bool $required = true): mixed
{
    $val = isset($body[$key]) ? trim((string)$body[$key]) : null;
    if ($required && ($val === null || $val === '')) {
        respondError("El campo '{$key}' es obligatorio.");
    }
    return $val;
}

/* ══════════════════════════════════════════════════
   CONEXIÓN · PDO con manejo de errores
══════════════════════════════════════════════════ */
function getConnection(): PDO
{
    static $pdo = null;

    if ($pdo !== null) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHAR
    );

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        // No exponer detalles de conexión al cliente
        error_log('DB Connection error: ' . $e->getMessage());
        respondError('No se pudo conectar a la base de datos.', 503);
    }

    return $pdo;
}

/* ══════════════════════════════════════════════════
   VALIDACIONES DE NEGOCIO
══════════════════════════════════════════════════ */
const ROLES_VALIDOS = ['admin', 'editor', 'viewer'];

/**
 * Validar que los datos del usuario son correctos.
 * Lanza respondError() si algo falla.
 *
 * @param array<string, mixed> $data
 * @param int|null $excludeId  ID a excluir en validación de email único (UPDATE)
 */
function validateUsuario(array $data, ?int $excludeId = null): void
{
    // Nombre
    if (strlen($data['nombre']) < 2) {
        respondError('El nombre debe tener al menos 2 caracteres.');
    }
    if (strlen($data['nombre']) > 100) {
        respondError('El nombre no puede superar 100 caracteres.');
    }

    // Email
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        respondError('El correo electrónico no tiene un formato válido.');
    }
    if (strlen($data['email']) > 160) {
        respondError('El correo no puede superar 160 caracteres.');
    }

    // Rol
    if (!in_array($data['rol'], ROLES_VALIDOS, true)) {
        respondError('El rol debe ser: admin, editor o viewer.');
    }

    // Email único
    $pdo  = getConnection();
    $sql  = 'SELECT id FROM usuarios WHERE email = :email';
    $params = [':email' => $data['email']];

    if ($excludeId !== null) {
        $sql .= ' AND id != :id';
        $params[':id'] = $excludeId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($stmt->fetch()) {
        respondError('Ya existe un usuario con ese correo electrónico.', 409);
    }
}

/* ══════════════════════════════════════════════════
   ACCIONES CRUD
══════════════════════════════════════════════════ */

/* ── READ · GET /api.php?action=read ────────────── */
function actionRead(): void
{
    $pdo  = getConnection();
    $stmt = $pdo->query(
        'SELECT id, nombre, email, rol, activo, created_at
         FROM usuarios
         ORDER BY id DESC'
    );
    $usuarios = $stmt->fetchAll();

    // Normalizar tipos para JSON
    foreach ($usuarios as &$u) {
        $u['id']     = (int)$u['id'];
        $u['activo'] = (int)$u['activo'];
    }
    unset($u);

    respond(['ok' => true, 'usuarios' => $usuarios]);
}

/* ── CREATE · POST /api.php?action=create ──────── */
function actionCreate(): void
{
    $body = getBody();

    $data = [
        'nombre' => field($body, 'nombre'),
        'email'  => field($body, 'email'),
        'rol'    => field($body, 'rol'),
        'activo' => isset($body['activo']) ? (int)(bool)$body['activo'] : 0,
    ];

    validateUsuario($data);

    $pdo  = getConnection();
    $stmt = $pdo->prepare(
        'INSERT INTO usuarios (nombre, email, rol, activo)
         VALUES (:nombre, :email, :rol, :activo)'
    );
    $stmt->execute([
        ':nombre' => $data['nombre'],
        ':email'  => $data['email'],
        ':rol'    => $data['rol'],
        ':activo' => $data['activo'],
    ]);

    $newId = (int)$pdo->lastInsertId();

    respond([
        'ok'      => true,
        'message' => 'Usuario creado correctamente.',
        'id'      => $newId,
    ], 201);
}

/* ── UPDATE · PUT /api.php?action=update ───────── */
function actionUpdate(): void
{
    $body = getBody();

    $id = isset($body['id']) ? (int)$body['id'] : 0;
    if ($id <= 0) respondError('ID de usuario inválido.');

    $data = [
        'nombre' => field($body, 'nombre'),
        'email'  => field($body, 'email'),
        'rol'    => field($body, 'rol'),
        'activo' => isset($body['activo']) ? (int)(bool)$body['activo'] : 0,
    ];

    // Verificar que el usuario existe
    $pdo  = getConnection();
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE id = :id');
    $stmt->execute([':id' => $id]);
    if (!$stmt->fetch()) {
        respondError('Usuario no encontrado.', 404);
    }

    validateUsuario($data, $id);

    $stmt = $pdo->prepare(
        'UPDATE usuarios
         SET nombre = :nombre,
             email  = :email,
             rol    = :rol,
             activo = :activo
         WHERE id = :id'
    );
    $stmt->execute([
        ':nombre' => $data['nombre'],
        ':email'  => $data['email'],
        ':rol'    => $data['rol'],
        ':activo' => $data['activo'],
        ':id'     => $id,
    ]);

    respond([
        'ok'      => true,
        'message' => 'Usuario actualizado correctamente.',
        'updated' => $stmt->rowCount(),
    ]);
}

/* ── DELETE · DELETE /api.php?action=delete ────── */
function actionDelete(): void
{
    $body = getBody();

    $id = isset($body['id']) ? (int)$body['id'] : 0;
    if ($id <= 0) respondError('ID de usuario inválido.');

    $pdo  = getConnection();

    // Verificar que existe antes de borrar
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE id = :id');
    $stmt->execute([':id' => $id]);
    if (!$stmt->fetch()) {
        respondError('Usuario no encontrado.', 404);
    }

    $stmt = $pdo->prepare('DELETE FROM usuarios WHERE id = :id');
    $stmt->execute([':id' => $id]);

    respond([
        'ok'      => true,
        'message' => 'Usuario eliminado correctamente.',
    ]);
}

/* ══════════════════════════════════════════════════
   ROUTER · Despachar la acción solicitada
══════════════════════════════════════════════════ */
try {
    $action = strtolower(trim($_GET['action'] ?? ''));

    match ($action) {
        'read'   => actionRead(),
        'create' => actionCreate(),
        'update' => actionUpdate(),
        'delete' => actionDelete(),
        default  => respondError("Acción desconocida: '{$action}'.", 400),
    };

} catch (PDOException $e) {
    error_log('PDO error: ' . $e->getMessage());
    respondError('Error interno de base de datos.', 500);

} catch (Throwable $e) {
    error_log('Unexpected error: ' . $e->getMessage());
    respondError('Error interno del servidor.', 500);
}

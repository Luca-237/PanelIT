// =====================================================================
//  Configuración del servidor. Todo sale de variables de entorno
//  (archivo .env en la raíz del proyecto, que NUNCA va al repo).
//  Ver .env.ejemplo.
// =====================================================================
const fs = require("fs");
const path = require("path");

const archivoEnv = path.join(__dirname, "..", ".env");
if (fs.existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);

function leerConfig(env = process.env) {
  const cfg = {
    puerto: Number(env.PUERTO || 3080),
    mongoUri: env.MONGODB_URI || "",
    mongoBase: env.MONGODB_BASE || "panel_it",
    // Clave de 32 bytes en base64 para cifrar las contraseñas de los equipos.
    // Si se pierde, las contraseñas guardadas NO se pueden recuperar.
    claveCifrado: env.CLAVE_CIFRADO || "",
    // En producción la cookie de sesión solo viaja por HTTPS
    produccion: env.NODE_ENV === "production",
    horasSesion: Number(env.HORAS_SESION || 12),
    // Imágenes de las páginas (opcional: sin esto, no se pueden subir imágenes)
    cloudinary: {
      cloudName: env.CLOUDINARY_CLOUD_NAME || "",
      apiKey: env.CLOUDINARY_API_KEY || "",
      apiSecret: env.CLOUDINARY_API_SECRET || "",
      carpeta: env.CLOUDINARY_CARPETA || "panel-it",
    },
  };
  const faltan = [];
  if (!cfg.mongoUri) faltan.push("MONGODB_URI");
  if (!cfg.claveCifrado) faltan.push("CLAVE_CIFRADO");
  else if (Buffer.from(cfg.claveCifrado, "base64").length !== 32) faltan.push("CLAVE_CIFRADO (tiene que ser de 32 bytes en base64: npm run generar-clave)");
  cfg.faltan = faltan;
  return cfg;
}

module.exports = { leerConfig };

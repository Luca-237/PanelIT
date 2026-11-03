// =====================================================================
//  Contraseñas de los usuarios del panel (hash scrypt) y cifrado de las
//  contraseñas de los equipos (AES-256-GCM). Solo usa el módulo crypto
//  de Node, sin dependencias externas.
// =====================================================================
const crypto = require("crypto");

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// "scrypt$<sal>$<hash>" en base64
function hashPassword(password) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, sal, 64, SCRYPT);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

function verificarPassword(password, guardado) {
  const [alg, sal, hash] = String(guardado || "").split("$");
  if (alg !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const calculado = crypto.scryptSync(password, Buffer.from(sal, "base64"), esperado.length, SCRYPT);
  return crypto.timingSafeEqual(esperado, calculado);
}

// Hash que se compara cuando el usuario no existe, para que tarde lo mismo
// y no se pueda adivinar qué usuarios existen midiendo el tiempo
const HASH_FALSO = hashPassword(crypto.randomBytes(12).toString("hex"));

function crearCifrador(claveBase64) {
  const clave = Buffer.from(claveBase64, "base64");
  if (clave.length !== 32) throw new Error("CLAVE_CIFRADO tiene que ser de 32 bytes en base64");
  return {
    cifrar(texto) {
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv("aes-256-gcm", clave, iv);
      const dato = Buffer.concat([c.update(String(texto), "utf8"), c.final()]);
      return { v: 1, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), dato: dato.toString("base64") };
    },
    descifrar(sobre) {
      const d = crypto.createDecipheriv("aes-256-gcm", clave, Buffer.from(sobre.iv, "base64"));
      d.setAuthTag(Buffer.from(sobre.tag, "base64"));
      return Buffer.concat([d.update(Buffer.from(sobre.dato, "base64")), d.final()]).toString("utf8");
    },
  };
}

// Token de sesión: el navegador guarda el token; la base, solo su hash
const nuevoToken = () => crypto.randomBytes(32).toString("base64url");
const hashToken = token => crypto.createHash("sha256").update(String(token)).digest("hex");

module.exports = { hashPassword, verificarPassword, HASH_FALSO, crearCifrador, nuevoToken, hashToken };

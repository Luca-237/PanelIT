// =====================================================================
//  Ayudas compartidas por las rutas: errores, validación de campos,
//  ids de Mongo y registro de actividad.
// =====================================================================
const { ObjectId } = require("mongodb");

class ErrorHttp extends Error {
  constructor(estado, mensaje) { super(mensaje); this.estado = estado; }
}
const error = (estado, mensaje) => new ErrorHttp(estado, mensaje);

// Envuelve un handler async para que los errores lleguen al manejador central
const async_ = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function oid(texto) {
  if (!ObjectId.isValid(String(texto)) || String(texto).length !== 24) throw error(404, "No existe");
  return new ObjectId(String(texto));
}

// Texto opcional: recorta espacios y largo máximo; "" si no vino
function texto(valor, max = 200) {
  if (valor === undefined || valor === null) return "";
  if (typeof valor !== "string" && typeof valor !== "number") throw error(400, "Dato con formato inválido");
  const t = String(valor).trim();
  if (t.length > max) throw error(400, `Un texto supera los ${max} caracteres`);
  return t;
}

function obligatorio(valor, nombre, max = 200) {
  const t = texto(valor, max);
  if (!t) throw error(400, `Falta ${nombre}`);
  return t;
}

function opcion(valor, permitidas, nombre) {
  if (!permitidas.includes(valor)) throw error(400, `${nombre} inválido`);
  return valor;
}

function etiquetas(valor) {
  const lista = Array.isArray(valor) ? valor : String(valor || "").split(",");
  return [...new Set(lista.map(e => texto(e, 40)).filter(Boolean))].slice(0, 15);
}

// Pasa _id a id (string) para el navegador
function publico(doc) {
  if (!doc) return doc;
  const { _id, ...resto } = doc;
  for (const k of Object.keys(resto)) if (resto[k] instanceof ObjectId) resto[k] = String(resto[k]);
  return { id: String(_id), ...resto };
}

// Middleware de rol para las rutas
const soloRoles = (...roles) => (req, res, next) =>
  roles.includes(req.usuario.rol) ? next() : next(error(403, "No tenés permiso para esto"));

async function registrar(db, req, accion, detalle = "") {
  await db.collection("actividad").insertOne({
    fecha: new Date(),
    usuario: req.usuario ? req.usuario.usuario : "",
    accion, detalle: String(detalle).slice(0, 300),
    ip: req.ip,
  });
}

module.exports = { ErrorHttp, error, async_, oid, texto, obligatorio, opcion, etiquetas, publico, registrar, soloRoles };

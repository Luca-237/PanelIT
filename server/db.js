// =====================================================================
//  Conexión a MongoDB Atlas y estructura de la base: colecciones con
//  validación de esquema e índices. Todo es idempotente: se puede correr
//  en cada arranque (o a mano con `npm run preparar-base`) sin pisar datos.
//
//  Colecciones:
//    usuarios           quién entra al panel (hash scrypt, rol)
//    sesiones           cookie de sesión (solo el hash del token; vence sola)
//    equipos            inventario de PCs, notebooks, cajas y servidores
//    credenciales       contraseñas de los equipos, CIFRADAS (solo admin)
//    usuarios_servidor  usuarios de Windows del servidor (Escritorio remoto)
//    paginas            páginas tipo Notion: padreId + lista de bloques
//    pendientes         lista compartida de pendientes de tecnología
//    meta               marcas internas (ej. guía inicial ya creada)
//    actividad          registro de movimientos
//  La validación solo exige lo imprescindible: si hace falta más campos,
//  se agregan sin migrar nada (MongoDB no tiene columnas fijas).
// =====================================================================
const { MongoClient } = require("mongodb");

const str = { bsonType: "string" };
const ESQUEMAS = {
  usuarios: { required: ["usuario", "nombre", "rol", "activo", "hash"], properties: {
    usuario: str, nombre: str, hash: str, activo: { bsonType: "bool" }, rol: { enum: ["admin", "tecnico", "consulta"] } } },
  sesiones: { required: ["usuarioId", "expira"], properties: { usuarioId: { bsonType: "objectId" }, expira: { bsonType: "date" } } },
  equipos: { required: ["descripcion", "tipo", "estado"], properties: {
    descripcion: str, tipo: str, estado: { enum: ["activo", "reparacion", "baja"] }, facturacion: { bsonType: "bool" }, etiquetas: { bsonType: "array" } } },
  credenciales: { required: ["equipoId", "tipo", "secreto"], properties: {
    equipoId: { bsonType: "objectId" }, tipo: { enum: ["teamviewer", "anydesk", "windows", "servidor", "otra"] },
    secreto: { bsonType: "object", required: ["iv", "tag", "dato"] } } },
  usuarios_servidor: { required: ["nombre", "nombreClave"], properties: { nombre: str, nombreClave: str } },
  paginas: { required: ["titulo", "bloques"], properties: {
    titulo: str, bloques: { bsonType: "array" }, etiquetas: { bsonType: "array" }, padreId: { bsonType: ["objectId", "null"] }, equipoId: { bsonType: ["objectId", "null"] } } },
  pendientes: { required: ["titulo", "estado", "prioridad"], properties: {
    titulo: str, estado: { enum: ["pendiente", "en_curso", "hecho"] }, prioridad: { enum: ["alta", "media", "baja"] },
    equipoId: { bsonType: ["objectId", "null"] }, paginaId: { bsonType: ["objectId", "null"] } } },
  actividad: { required: ["fecha", "accion"], properties: { fecha: { bsonType: "date" }, accion: str } },
  meta: null,
};

async function conectar(uri, nombreBase) {
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, appName: "panel-it-cindy" });
  await cliente.connect();
  const db = cliente.db(nombreBase);
  await prepararBase(db);
  return { cliente, db };
}

// Crea las colecciones que falten (con su validación) y actualiza la validación de las existentes
async function prepararColecciones(db) {
  const existentes = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  for (const [nombre, esquema] of Object.entries(ESQUEMAS)) {
    const opciones = esquema ? { validator: { $jsonSchema: { bsonType: "object", ...esquema } }, validationLevel: "moderate", validationAction: "error" } : {};
    if (!existentes.has(nombre)) await db.createCollection(nombre, opciones);
    else if (esquema) await db.command({ collMod: nombre, ...opciones });
  }
}

async function prepararIndices(db) {
  await Promise.all([
    db.collection("usuarios").createIndex({ usuario: 1 }, { unique: true }),
    // Las sesiones vencidas las borra Mongo solo (índice TTL)
    db.collection("sesiones").createIndex({ expira: 1 }, { expireAfterSeconds: 0 }),
    db.collection("equipos").createIndex({ descripcion: 1 }),
    db.collection("credenciales").createIndex({ equipoId: 1 }),
    db.collection("usuarios_servidor").createIndex({ nombreClave: 1 }, { unique: true }),
    db.collection("paginas").createIndex({ padreId: 1, orden: 1 }),
    db.collection("paginas").createIndex({ equipoId: 1 }),
    db.collection("pendientes").createIndex({ estado: 1, prioridad: 1 }),
    db.collection("actividad").createIndex({ fecha: -1 }),
  ]);
}

async function prepararBase(db) {
  await prepararColecciones(db);
  await prepararIndices(db);
}

module.exports = { conectar, prepararBase, prepararColecciones, prepararIndices, ESQUEMAS };

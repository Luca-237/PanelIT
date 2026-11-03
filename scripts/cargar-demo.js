// =====================================================================
//  Carga los datos inventados de public/pruebas/datos-demo.js en una
//  base (la local en memoria o la de las pruebas). Nunca en producción.
// =====================================================================
const crypto = require("crypto");
const DEMO = require("../public/pruebas/datos-demo");

async function cargarDemo(db, cifrador) {
  const ahora = new Date();
  const ids = new Map();
  for (const { clave, ...equipo } of DEMO.equipos) {
    const r = await db.collection("equipos").insertOne({ ...equipo, creado: ahora, actualizado: ahora, actualizadoPor: "Datos de prueba" });
    ids.set(equipo.descripcion, r.insertedId);
    if (clave) await db.collection("credenciales").insertOne({
      equipoId: r.insertedId, tipo: equipo.teamviewerId ? "teamviewer" : "otra", usuario: "",
      secreto: cifrador.cifrar(clave), actualizado: ahora, actualizadoPor: "Datos de prueba",
    });
  }
  await db.collection("usuarios_servidor").insertMany(DEMO.usuariosServidor.map(nombre => ({ nombre, nombreClave: nombre.toLowerCase(), notas: "" })));

  // Páginas: primero todas (para tener los ids), después padres y bloques de subpágina
  const pags = new Map();
  for (const [orden, p] of DEMO.paginas.entries()) {
    const r = await db.collection("paginas").insertOne({ titulo: p.titulo, orden, bloques: [], etiquetas: p.etiquetas || [], fijada: !!p.fijada,
      equipoId: ids.get(p.equipo) || null, padreId: null, autor: "Datos de prueba", creado: ahora, actualizado: ahora, actualizadoPor: "Datos de prueba" });
    pags.set(p.titulo, r.insertedId);
  }
  for (const p of DEMO.paginas) {
    const bloques = p.bloques.map(({ pagina, ...b }) => ({ id: crypto.randomBytes(6).toString("hex"), ...b, ...(pagina ? { paginaId: String(pags.get(pagina)) } : {}) }));
    await db.collection("paginas").updateOne({ _id: pags.get(p.titulo) }, { $set: { bloques, padreId: p.padre ? pags.get(p.padre) : null } });
  }
}

module.exports = { cargarDemo };

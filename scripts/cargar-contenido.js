// =====================================================================
//  Carga en la base las páginas de scripts/contenido-inicial.js (y sus
//  subpáginas). No pisa nada: si ya hay una página con el mismo título
//  en el mismo lugar, la deja como está (puede haber sido editada).
//    npm run cargar-contenido -- --simular    (solo muestra qué haría)
//    npm run cargar-contenido                 (carga)
//  Además mueve la guía "Conexión con el servidor" adentro de la página
//  "Conexión al servidor y a las impresoras" y marca la IP dudosa.
// =====================================================================
const crypto = require("crypto");
const { leerConfig } = require("../server/config");
const { conectar } = require("../server/db");
const CONTENIDO = require("./contenido-inicial");

const nuevoId = () => crypto.randomBytes(6).toString("hex");
const AUTOR = "Carga inicial (Claude)";

async function cargar(db, paginas, { simular = false } = {}) {
  const col = db.collection("paginas");
  const r = { creadas: [], existentes: [], bloques: 0 };

  async function crear(p, padreId, orden) {
    const existente = await col.findOne({ titulo: p.titulo, padreId });
    if (existente) {
      r.existentes.push(p.titulo);
      // Igual se recorren las hijas, por si falta alguna
      for (const [i, hija] of (p.hijas || []).entries()) await crear(hija, existente._id, i);
      return existente._id;
    }
    const _id = simular ? null : (await col.insertOne({
      titulo: p.titulo, padreId, orden, bloques: [], etiquetas: p.etiquetas || [], fijada: false, equipoId: null,
      autor: AUTOR, creado: new Date(), actualizado: new Date(), actualizadoPor: AUTOR,
    })).insertedId;
    r.creadas.push(p.titulo);
    // Hijas primero (necesitamos sus ids para los enlaces)
    const idsHijas = [];
    for (const [i, hija] of (p.hijas || []).entries()) idsHijas.push({ titulo: hija.titulo, id: await crear(hija, _id, i) });
    const bloques = p.bloques.map(b => ({ id: nuevoId(), ...b }));
    if (idsHijas.length) {
      bloques.push({ id: nuevoId(), tipo: "separador", texto: "" }, { id: nuevoId(), tipo: "subtitulo", texto: "En esta sección" });
      idsHijas.forEach(h => bloques.push({ id: nuevoId(), tipo: "subpagina", texto: "", paginaId: simular ? "simulada" : String(h.id) }));
    }
    r.bloques += bloques.length;
    if (!simular) await col.updateOne({ _id }, { $set: { bloques } });
    return _id;
  }

  const ultimo = await col.find({ padreId: null }).sort({ orden: -1 }).limit(1).toArray();
  let orden = ultimo.length ? (ultimo[0].orden || 0) + 1 : 0;
  const ids = {};
  for (const p of paginas) ids[p.titulo] = await crear(p, null, orden++);

  // La guía del servidor pasa a ser una subpágina de "Conexión al servidor y a las impresoras"
  const guia = await col.findOne({ titulo: "Conexión con el servidor", padreId: null });
  const destino = ids["Conexión al servidor y a las impresoras"];
  r.guiaMovida = false; r.guiaParcheada = false;
  if (guia && destino && !simular) {
    // Se agrega el enlace a la guía en la página destino (si no estaba)
    const dest = await col.findOne({ _id: destino });
    if (!dest.bloques.some(b => b.tipo === "subpagina" && b.paginaId === String(guia._id))) {
      await col.updateOne({ _id: destino }, { $push: { bloques: { id: nuevoId(), tipo: "subpagina", texto: "", paginaId: String(guia._id) } } });
    }
    await col.updateOne({ _id: guia._id }, { $set: { padreId: destino, orden: 99 } });
    r.guiaMovida = true;
  }
  if (guia && !simular) {
    // La IP de serverbags no coincide con la reserva del router: se deja la duda a la vista
    const marca = "192.168.0.62`.";
    const bloques = guia.bloques.map(b => b.tipo === "lista" && b.texto.includes(marca) && !b.texto.includes("a confirmar")
      ? { ...b, texto: b.texto.replace(marca, "192.168.0.62` (a confirmar: el router tiene esa IP reservada a `SERVER-SQL`).") } : b);
    if (JSON.stringify(bloques) !== JSON.stringify(guia.bloques)) { await col.updateOne({ _id: guia._id }, { $set: { bloques } }); r.guiaParcheada = true; }
  }
  return r;
}

async function main() {
  const simular = process.argv.includes("--simular");
  const config = leerConfig();
  if (config.faltan.length) throw new Error("Falta configurar en .env: " + config.faltan.join(", "));
  const { cliente, db } = await conectar(config.mongoUri, config.mongoBase);
  try {
    const r = await cargar(db, CONTENIDO, { simular });
    console.log(simular ? "SIMULACIÓN (no se grabó nada)" : "Cargado.");
    console.log(`Páginas nuevas (${r.creadas.length}):`); r.creadas.forEach(t => console.log("  + " + t));
    if (r.existentes.length) { console.log(`Ya existían, sin tocar (${r.existentes.length}):`); r.existentes.forEach(t => console.log("  = " + t)); }
    console.log(`Bloques: ${r.bloques} · guía movida: ${r.guiaMovida} · IP de la guía marcada: ${r.guiaParcheada}`);
  } finally { await cliente.close(); }
}

module.exports = { cargar };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

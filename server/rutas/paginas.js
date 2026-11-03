// =====================================================================
//  Páginas estilo Notion: árbol de páginas y subpáginas, cada una con
//  una lista de bloques (texto, títulos, listas, tareas, código, aviso,
//  imagen, separador, subpágina). Pueden ir atadas a un equipo.
//  Leen todos; crean, editan y borran admin y técnico.
//  La primera vez se crea la página "Conexión con el servidor" con la
//  guía inicial (server/guia-inicial.js).
// =====================================================================
const crypto = require("crypto");
const { error, async_, oid, texto, obligatorio, etiquetas, registrar, soloRoles } = require("../util");
const GUIA_INICIAL = require("../guia-inicial");

const TIPOS = ["texto", "titulo", "subtitulo", "lista", "tareas", "codigo", "aviso", "imagen", "separador", "subpagina"];
const MAX_BLOQUES = 400;
const nuevoId = () => crypto.randomBytes(6).toString("hex");

// Pasa el texto de la guía inicial ("- " = viñeta) a bloques
function bloquesDeGuia() {
  const bloques = [];
  GUIA_INICIAL.forEach(sec => {
    bloques.push({ id: nuevoId(), tipo: "titulo", texto: sec.titulo });
    let lista = null;
    sec.texto.split("\n").forEach(l => {
      if (/^\s*-\s+/.test(l)) {
        if (!lista) { lista = { id: nuevoId(), tipo: "lista", texto: "" }; bloques.push(lista); }
        lista.texto += (lista.texto ? "\n" : "") + l.replace(/^\s*-\s+/, "");
      } else if (l.trim()) {
        lista = null;
        const codigo = /^`[^`]+`$/.test(l.trim());
        bloques.push({ id: nuevoId(), tipo: codigo ? "codigo" : "texto", texto: codigo ? l.trim().slice(1, -1) : l });
      }
    });
  });
  return bloques;
}

module.exports = (app, { db, cloudinary }) => {
  const col = db.collection("paginas");
  const editar = soloRoles("admin", "tecnico");

  const resumen = p => ({
    id: String(p._id), titulo: p.titulo, padreId: p.padreId ? String(p.padreId) : null, orden: p.orden || 0,
    equipoId: p.equipoId ? String(p.equipoId) : null, etiquetas: p.etiquetas || [], fijada: !!p.fijada,
    actualizado: p.actualizado, actualizadoPor: p.actualizadoPor || "", creado: p.creado,
  });
  const completa = p => ({ ...resumen(p), bloques: p.bloques || [] });

  function leerBloques(lista) {
    if (!Array.isArray(lista) || lista.length > MAX_BLOQUES) throw error(400, `Una página puede tener hasta ${MAX_BLOQUES} bloques`);
    return lista.map(b => {
      if (!b || !TIPOS.includes(b.tipo)) throw error(400, "Bloque con tipo inválido");
      const out = { id: typeof b.id === "string" && /^[a-z0-9]{6,24}$/.test(b.id) ? b.id : nuevoId(), tipo: b.tipo, texto: texto(b.texto, 20000) };
      if (b.tipo === "imagen") {
        if (!cloudinary.urlValida(b.url, b.publicId)) throw error(400, "La imagen no es de la cuenta de Cloudinary del panel");
        Object.assign(out, { url: b.url, publicId: b.publicId, ancho: Number(b.ancho) || null, alto: Number(b.alto) || null });
      }
      if (b.tipo === "subpagina") out.paginaId = String(oid(b.paginaId));
      if (b.tipo === "aviso") out.color = ["naranja", "gris", "rojo", "verde"].includes(b.color) ? b.color : "naranja";
      return out;
    });
  }

  async function equipoValido(id) {
    if (!id) return null;
    const _id = oid(id);
    if (!(await db.collection("equipos").findOne({ _id }))) throw error(400, "El equipo elegido ya no existe");
    return _id;
  }

  // Ids de la página y todas sus subpáginas (para borrar o evitar ciclos)
  async function subarbol(_id) {
    const todas = await col.find({}, { projection: { padreId: 1 } }).toArray();
    const ids = [_id];
    for (let i = 0; i < ids.length; i++)
      todas.forEach(p => { if (p.padreId && p.padreId.equals(ids[i])) ids.push(p._id); });
    return ids;
  }

  async function sembrarGuia() {
    const meta = db.collection("meta");
    if (await meta.findOne({ _id: "guia-sembrada" })) return;
    const r = await col.insertOne({
      titulo: "Conexión con el servidor", padreId: null, orden: 0, bloques: bloquesDeGuia(), equipoId: null, etiquetas: ["servidor"],
      fijada: true, creado: new Date(), actualizado: new Date(), actualizadoPor: "Guía inicial",
    });
    await meta.insertOne({ _id: "guia-sembrada", paginaId: r.insertedId });
  }

  app.get("/api/paginas", async_(async (req, res) => {
    await sembrarGuia();
    const filtro = req.query.equipo ? { equipoId: oid(req.query.equipo) } : {};
    const lista = await col.find(filtro, { projection: { bloques: 0 } }).sort({ orden: 1, creado: 1 }).toArray();
    const guia = await db.collection("meta").findOne({ _id: "guia-sembrada" });
    res.json({ paginas: lista.map(resumen), guiaId: guia && guia.paginaId ? String(guia.paginaId) : null });
  }));

  app.get("/api/paginas/:id", async_(async (req, res) => {
    const p = await col.findOne({ _id: oid(req.params.id) });
    if (!p) throw error(404, "Esa página ya no existe");
    res.json(completa(p));
  }));

  app.post("/api/paginas", editar, async_(async (req, res) => {
    let padreId = null;
    if (req.body.padreId) {
      padreId = oid(req.body.padreId);
      if (!(await col.findOne({ _id: padreId }))) throw error(400, "La página de arriba ya no existe");
    }
    const ultimo = await col.find({ padreId }).sort({ orden: -1 }).limit(1).toArray();
    const doc = {
      titulo: texto(req.body.titulo, 200), padreId, orden: ultimo.length ? (ultimo[0].orden || 0) + 1 : 0, bloques: [],
      equipoId: await equipoValido(req.body.equipoId), etiquetas: [], fijada: false,
      autor: req.usuario.nombre, creado: new Date(), actualizado: new Date(), actualizadoPor: req.usuario.nombre,
    };
    const r = await col.insertOne(doc);
    await registrar(db, req, "página nueva", doc.titulo || "Sin título");
    res.status(201).json(completa({ _id: r.insertedId, ...doc }));
  }));

  // Guarda lo que venga: título, bloques, equipo, etiquetas, fijada, padre (mover)
  app.put("/api/paginas/:id", editar, async_(async (req, res) => {
    const _id = oid(req.params.id);
    const p = await col.findOne({ _id });
    if (!p) throw error(404, "Esa página ya no existe");
    const b = req.body, cambios = { actualizado: new Date(), actualizadoPor: req.usuario.nombre };
    if ("titulo" in b) cambios.titulo = texto(b.titulo, 200);
    if ("bloques" in b) cambios.bloques = leerBloques(b.bloques);
    if ("equipoId" in b) cambios.equipoId = await equipoValido(b.equipoId);
    if ("etiquetas" in b) cambios.etiquetas = etiquetas(b.etiquetas);
    if ("fijada" in b) cambios.fijada = b.fijada === true;
    if ("padreId" in b) {
      const nuevo = b.padreId ? oid(b.padreId) : null;
      if (nuevo && (await subarbol(_id)).some(x => x.equals(nuevo))) throw error(400, "No se puede mover una página adentro de sí misma");
      if (nuevo && !(await col.findOne({ _id: nuevo }))) throw error(400, "La página de destino ya no existe");
      cambios.padreId = nuevo;
    }
    await col.updateOne({ _id }, { $set: cambios });
    // Imágenes que se sacaron de la página: se borran de Cloudinary
    if (cambios.bloques) {
      const quedan = new Set(cambios.bloques.filter(x => x.publicId).map(x => x.publicId));
      (p.bloques || []).filter(x => x.publicId && !quedan.has(x.publicId)).forEach(x => cloudinary.borrar(x.publicId));
    }
    res.json(completa({ ...p, ...cambios }));
  }));

  app.delete("/api/paginas/:id", editar, async_(async (req, res) => {
    const _id = oid(req.params.id);
    const p = await col.findOne({ _id });
    if (!p) throw error(404, "Esa página ya no existe");
    const ids = await subarbol(_id);
    const todas = await col.find({ _id: { $in: ids } }).toArray();
    await col.deleteMany({ _id: { $in: ids } });
    todas.forEach(x => (x.bloques || []).forEach(bl => { if (bl.publicId) cloudinary.borrar(bl.publicId); }));
    await registrar(db, req, "página borrada", `${p.titulo || "Sin título"}${ids.length > 1 ? ` y ${ids.length - 1} subpágina(s)` : ""}`);
    res.json({ ok: true, borradas: ids.length });
  }));

  app.get("/api/imagenes/estado", (req, res) => res.json({ activo: cloudinary.activo }));

  app.post("/api/imagenes/firma", editar, (req, res, next) => {
    if (!cloudinary.activo) return next(error(503, "Las imágenes todavía no están configuradas (faltan los datos de Cloudinary en el servidor)"));
    res.json(cloudinary.firmaSubida());
  });
};

module.exports.TIPOS = TIPOS;

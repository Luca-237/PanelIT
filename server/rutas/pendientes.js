// =====================================================================
//  Pendientes de tecnología: lista corta y compartida de lo que falta
//  hacer. La ven todos los que entran al panel; crean, editan, marcan
//  como hechos y borran admin y técnico. Cada pendiente puede tener
//  responsable, un equipo y una página con el detalle.
// =====================================================================
const { error, async_, oid, texto, obligatorio, opcion, publico, registrar, soloRoles } = require("../util");

const ESTADOS = ["pendiente", "en_curso", "hecho"];
const PRIORIDADES = ["alta", "media", "baja"];

module.exports = (app, { db }) => {
  const col = db.collection("pendientes");
  const editar = soloRoles("admin", "tecnico");

  async function existe(coleccion, id, nombre) {
    if (!id) return null;
    const _id = oid(id);
    if (!(await db.collection(coleccion).findOne({ _id }, { projection: { _id: 1 } }))) throw error(400, `${nombre} ya no existe`);
    return _id;
  }

  async function leer(b) {
    return {
      titulo: obligatorio(b.titulo, "el título", 200),
      detalle: texto(b.detalle, 3000),
      estado: opcion(b.estado || "pendiente", ESTADOS, "Estado"),
      prioridad: opcion(b.prioridad || "media", PRIORIDADES, "Prioridad"),
      responsable: texto(b.responsable, 80),
      equipoId: await existe("equipos", b.equipoId, "El equipo elegido"),
      paginaId: await existe("paginas", b.paginaId, "La página elegida"),
    };
  }

  app.get("/api/pendientes", async_(async (req, res) => {
    res.json((await col.find({}).sort({ creado: 1 }).toArray()).map(publico));
  }));

  app.post("/api/pendientes", editar, async_(async (req, res) => {
    const doc = { ...(await leer(req.body)), autor: req.usuario.nombre, creado: new Date(), actualizado: new Date(), actualizadoPor: req.usuario.nombre, hechoEn: null };
    if (doc.estado === "hecho") doc.hechoEn = new Date();
    const r = await col.insertOne(doc);
    await registrar(db, req, "pendiente nuevo", doc.titulo);
    res.status(201).json(publico({ _id: r.insertedId, ...doc }));
  }));

  app.put("/api/pendientes/:id", editar, async_(async (req, res) => {
    const _id = oid(req.params.id);
    const previo = await col.findOne({ _id });
    if (!previo) throw error(404, "Ese pendiente ya no existe");
    const cambios = { ...(await leer(req.body)), actualizado: new Date(), actualizadoPor: req.usuario.nombre };
    // La fecha de "hecho" se pone al pasar a hecho y se borra si vuelve atrás
    cambios.hechoEn = cambios.estado === "hecho" ? (previo.hechoEn || new Date()) : null;
    const r = await col.findOneAndUpdate({ _id }, { $set: cambios }, { returnDocument: "after" });
    if (previo.estado !== cambios.estado) await registrar(db, req, `pendiente → ${cambios.estado.replace("_", " ")}`, cambios.titulo);
    else await registrar(db, req, "pendiente editado", cambios.titulo);
    res.json(publico(r));
  }));

  app.delete("/api/pendientes/:id", editar, async_(async (req, res) => {
    const r = await col.findOneAndDelete({ _id: oid(req.params.id) });
    if (!r) throw error(404, "Ese pendiente ya no existe");
    await registrar(db, req, "pendiente borrado", r.titulo);
    res.json({ ok: true });
  }));
};

module.exports.ESTADOS = ESTADOS;
module.exports.PRIORIDADES = PRIORIDADES;

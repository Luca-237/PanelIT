// =====================================================================
//  Equipos (PCs, notebooks, cajas, servidores). Leen todos; cargan y
//  editan admin y técnico; borrar del todo, solo admin (lo normal es
//  pasarlo a "De baja"); sus páginas quedan, sin equipo.
// =====================================================================
const { error, async_, oid, texto, obligatorio, opcion, etiquetas, publico, registrar, soloRoles } = require("../util");

const TIPOS = ["PC", "Notebook", "All in one", "Mini PC", "Tablet", "Servidor", "Otro"];
const ESTADOS = ["activo", "reparacion", "baja"];

function leerEquipo(b) {
  return {
    descripcion: obligatorio(b.descripcion, "la descripción", 120),
    tipo: opcion(b.tipo || "PC", TIPOS, "Tipo"),
    sucursal: texto(b.sucursal, 80),
    nombreEquipo: texto(b.nombreEquipo, 80),
    usuarioHabitual: texto(b.usuarioHabitual, 120),
    facturacion: b.facturacion === true,
    teamviewerId: texto(b.teamviewerId, 30),
    anydeskId: texto(b.anydeskId, 30),
    puntoVentaMagnus: texto(b.puntoVentaMagnus, 20),
    puntoVentaManager: texto(b.puntoVentaManager, 20),
    usuarioServidor: texto(b.usuarioServidor, 80),
    ip: texto(b.ip, 45),
    etiquetas: etiquetas(b.etiquetas),
    estado: opcion(b.estado || "activo", ESTADOS, "Estado"),
    observaciones: texto(b.observaciones, 2000),
  };
}

module.exports = (app, { db }) => {
  const col = db.collection("equipos");
  const editar = soloRoles("admin", "tecnico");

  app.get("/api/equipos", async_(async (req, res) => {
    const lista = await col.find({}).sort({ sucursal: 1, descripcion: 1 }).toArray();
    // Cuántas contraseñas guardadas tiene cada uno (sin mostrarlas)
    const conteo = await db.collection("credenciales").aggregate([{ $group: { _id: "$equipoId", n: { $sum: 1 } } }]).toArray();
    const n = new Map(conteo.map(c => [String(c._id), c.n]));
    res.json(lista.map(e => ({ ...publico(e), credenciales: n.get(String(e._id)) || 0 })));
  }));

  app.post("/api/equipos", editar, async_(async (req, res) => {
    const doc = { ...leerEquipo(req.body), creado: new Date(), actualizado: new Date(), actualizadoPor: req.usuario.nombre };
    const r = await col.insertOne(doc);
    await registrar(db, req, "alta de equipo", doc.descripcion);
    res.status(201).json(publico({ _id: r.insertedId, ...doc }));
  }));

  app.put("/api/equipos/:id", editar, async_(async (req, res) => {
    const _id = oid(req.params.id);
    const cambios = { ...leerEquipo(req.body), actualizado: new Date(), actualizadoPor: req.usuario.nombre };
    const r = await col.findOneAndUpdate({ _id }, { $set: cambios }, { returnDocument: "after" });
    if (!r) throw error(404, "Ese equipo ya no existe");
    await registrar(db, req, "edición de equipo", cambios.descripcion);
    res.json(publico(r));
  }));

  app.delete("/api/equipos/:id", soloRoles("admin"), async_(async (req, res) => {
    const _id = oid(req.params.id);
    const e = await col.findOne({ _id });
    if (!e) throw error(404, "Ese equipo ya no existe");
    await db.collection("credenciales").deleteMany({ equipoId: _id });
    await db.collection("paginas").updateMany({ equipoId: _id }, { $set: { equipoId: null } });
    await col.deleteOne({ _id });
    await registrar(db, req, "borrado de equipo", e.descripcion);
    res.json({ ok: true });
  }));
};

module.exports.TIPOS = TIPOS;
module.exports.ESTADOS = ESTADOS;

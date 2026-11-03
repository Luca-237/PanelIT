// =====================================================================
//  Contraseñas de los equipos (TeamViewer, AnyDesk, Windows, servidor).
//  SOLO admin. Se guardan cifradas (AES-256-GCM); el listado nunca trae
//  el valor, y cada vez que alguien la muestra queda en Actividad.
// =====================================================================
const { error, async_, oid, texto, obligatorio, opcion, registrar, soloRoles } = require("../util");

const TIPOS = ["teamviewer", "anydesk", "windows", "servidor", "otra"];
const NOMBRES = { teamviewer: "TeamViewer", anydesk: "AnyDesk", windows: "Windows", servidor: "Usuario del servidor", otra: "Otra" };

module.exports = (app, { db, cifrador }) => {
  const col = db.collection("credenciales");
  const admin = soloRoles("admin");
  const resumen = c => ({ id: String(c._id), equipoId: String(c.equipoId), tipo: c.tipo, usuario: c.usuario, actualizado: c.actualizado, actualizadoPor: c.actualizadoPor });

  async function equipo(id) {
    const e = await db.collection("equipos").findOne({ _id: oid(id) });
    if (!e) throw error(404, "Ese equipo ya no existe");
    return e;
  }

  app.get("/api/equipos/:id/credenciales", admin, async_(async (req, res) => {
    const e = await equipo(req.params.id);
    res.json((await col.find({ equipoId: e._id }).sort({ tipo: 1 }).toArray()).map(resumen));
  }));

  app.post("/api/equipos/:id/credenciales", admin, async_(async (req, res) => {
    const e = await equipo(req.params.id);
    const doc = {
      equipoId: e._id,
      tipo: opcion(req.body.tipo, TIPOS, "Tipo"),
      usuario: texto(req.body.usuario, 120),
      secreto: cifrador.cifrar(obligatorio(req.body.valor, "la contraseña", 300)),
      actualizado: new Date(), actualizadoPor: req.usuario.nombre,
    };
    const r = await col.insertOne(doc);
    await registrar(db, req, "contraseña cargada", `${NOMBRES[doc.tipo]} · ${e.descripcion}`);
    res.status(201).json(resumen({ _id: r.insertedId, ...doc }));
  }));

  app.put("/api/credenciales/:id", admin, async_(async (req, res) => {
    const _id = oid(req.params.id);
    const cambios = { tipo: opcion(req.body.tipo, TIPOS, "Tipo"), usuario: texto(req.body.usuario, 120), actualizado: new Date(), actualizadoPor: req.usuario.nombre };
    // Si no mandan contraseña nueva, queda la que estaba
    if (req.body.valor) cambios.secreto = cifrador.cifrar(texto(req.body.valor, 300));
    const r = await col.findOneAndUpdate({ _id }, { $set: cambios }, { returnDocument: "after" });
    if (!r) throw error(404, "Esa contraseña ya no existe");
    const e = await db.collection("equipos").findOne({ _id: r.equipoId });
    await registrar(db, req, "contraseña editada", `${NOMBRES[r.tipo]} · ${e ? e.descripcion : "?"}`);
    res.json(resumen(r));
  }));

  app.delete("/api/credenciales/:id", admin, async_(async (req, res) => {
    const r = await col.findOneAndDelete({ _id: oid(req.params.id) });
    if (!r) throw error(404, "Esa contraseña ya no existe");
    const e = await db.collection("equipos").findOne({ _id: r.equipoId });
    await registrar(db, req, "contraseña borrada", `${NOMBRES[r.tipo]} · ${e ? e.descripcion : "?"}`);
    res.json({ ok: true });
  }));

  // Mostrar el valor: POST (no GET) para que no quede en historiales ni cachés
  app.post("/api/credenciales/:id/revelar", admin, async_(async (req, res) => {
    const c = await col.findOne({ _id: oid(req.params.id) });
    if (!c) throw error(404, "Esa contraseña ya no existe");
    let valor;
    try { valor = cifrador.descifrar(c.secreto); }
    catch (e) { throw error(500, "No se pudo descifrar: ¿cambió la CLAVE_CIFRADO del servidor?"); }
    const e = await db.collection("equipos").findOne({ _id: c.equipoId });
    await registrar(db, req, "contraseña mostrada", `${NOMBRES[c.tipo]} · ${e ? e.descripcion : "?"}`);
    res.json({ valor });
  }));
};

module.exports.TIPOS = TIPOS;

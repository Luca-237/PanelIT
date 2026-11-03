// =====================================================================
//  Usuarios de Windows del servidor (los de Escritorio remoto). Cuántos
//  equipos usa cada uno se calcula en la página a partir de Equipos.
// =====================================================================
const { error, async_, oid, texto, obligatorio, publico, registrar, soloRoles } = require("../util");

module.exports = (app, { db }) => {
  const col = db.collection("usuarios_servidor");
  const editar = soloRoles("admin", "tecnico");
  const leer = b => {
    const nombre = obligatorio(b.nombre, "el nombre", 80);
    return { nombre, nombreClave: nombre.toLowerCase(), notas: texto(b.notas, 500) };
  };

  app.get("/api/usuarios-servidor", async_(async (req, res) => {
    res.json((await col.find({}).sort({ nombreClave: 1 }).toArray()).map(publico));
  }));

  app.post("/api/usuarios-servidor", editar, async_(async (req, res) => {
    const doc = leer(req.body);
    const r = await col.insertOne(doc);
    await registrar(db, req, "alta de usuario del servidor", doc.nombre);
    res.status(201).json(publico({ _id: r.insertedId, ...doc }));
  }));

  app.put("/api/usuarios-servidor/:id", editar, async_(async (req, res) => {
    const r = await col.findOneAndUpdate({ _id: oid(req.params.id) }, { $set: leer(req.body) }, { returnDocument: "after" });
    if (!r) throw error(404, "Ese usuario ya no existe");
    await registrar(db, req, "edición de usuario del servidor", r.nombre);
    res.json(publico(r));
  }));

  app.delete("/api/usuarios-servidor/:id", editar, async_(async (req, res) => {
    const r = await col.findOneAndDelete({ _id: oid(req.params.id) });
    if (!r) throw error(404, "Ese usuario ya no existe");
    await registrar(db, req, "baja de usuario del servidor", r.nombre);
    res.json({ ok: true });
  }));
};

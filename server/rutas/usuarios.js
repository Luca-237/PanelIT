// =====================================================================
//  Usuarios del panel (solo admin). Roles:
//   - admin: todo, incluidas las contraseñas de los equipos y Actividad
//   - tecnico: carga y edita equipos, usuarios del servidor y páginas
//   - consulta: solo mira
//  Nunca puede quedar el panel sin un admin activo.
// =====================================================================
const { hashPassword } = require("../cripto");
const { error, async_, oid, obligatorio, opcion, registrar, soloRoles } = require("../util");
const { perfil } = require("./auth");

const ROLES = ["admin", "tecnico", "consulta"];

module.exports = (app, { db }) => {
  const col = db.collection("usuarios");
  const admin = soloRoles("admin");
  const passwordValida = p => {
    if (typeof p !== "string" || p.length < 10) throw error(400, "La contraseña tiene que tener al menos 10 caracteres");
    return p;
  };

  async function quedaAdmin(excepto) {
    return (await col.countDocuments({ rol: "admin", activo: true, _id: { $ne: excepto } })) > 0;
  }

  app.get("/api/usuarios", admin, async_(async (req, res) => {
    res.json((await col.find({}).sort({ usuario: 1 }).toArray()).map(perfil));
  }));

  app.post("/api/usuarios", admin, async_(async (req, res) => {
    const usuario = obligatorio(req.body.usuario, "el usuario", 60).toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(usuario)) throw error(400, "El usuario solo puede tener letras sin acento, números, punto, guion y guion bajo");
    const doc = {
      usuario, nombre: obligatorio(req.body.nombre, "el nombre", 80),
      rol: opcion(req.body.rol, ROLES, "Rol"), activo: true,
      hash: hashPassword(passwordValida(req.body.password)), creado: new Date(),
    };
    const r = await col.insertOne(doc);
    await registrar(db, req, "alta de usuario del panel", `${usuario} (${doc.rol})`);
    res.status(201).json(perfil({ _id: r.insertedId, ...doc }));
  }));

  app.put("/api/usuarios/:id", admin, async_(async (req, res) => {
    const _id = oid(req.params.id);
    const u = await col.findOne({ _id });
    if (!u) throw error(404, "Ese usuario ya no existe");
    const cambios = {
      nombre: obligatorio(req.body.nombre, "el nombre", 80),
      rol: opcion(req.body.rol, ROLES, "Rol"),
      activo: req.body.activo !== false,
    };
    if ((cambios.rol !== "admin" || !cambios.activo) && u.rol === "admin" && !(await quedaAdmin(_id)))
      throw error(400, "Tiene que quedar al menos un admin activo");
    if (req.body.password) cambios.hash = hashPassword(passwordValida(req.body.password));
    await col.updateOne({ _id }, { $set: cambios });
    // Si lo desactivan o le cambian la contraseña, se le cierran las sesiones
    if (!cambios.activo || cambios.hash) await db.collection("sesiones").deleteMany({ usuarioId: _id });
    await registrar(db, req, "edición de usuario del panel", `${u.usuario}: ${cambios.rol}${cambios.activo ? "" : ", desactivado"}${cambios.hash ? ", contraseña nueva" : ""}`);
    res.json(perfil({ ...u, ...cambios }));
  }));
};

module.exports.ROLES = ROLES;

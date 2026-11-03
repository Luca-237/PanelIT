// =====================================================================
//  Ingreso, salida, perfil propio y cambio de contraseña propia.
//  Frena a quien prueba contraseñas: 5 intentos fallidos por usuario+IP
//  bloquean 15 minutos.
// =====================================================================
const { hashPassword, verificarPassword, HASH_FALSO, nuevoToken, hashToken } = require("../cripto");
const { error, async_, texto, registrar } = require("../util");

const MAX_INTENTOS = 5, BLOQUEO_MS = 15 * 60e3;
const intentos = new Map();   // "usuario|ip" → { fallos, hasta }

const perfil = u => ({ id: String(u._id), usuario: u.usuario, nombre: u.nombre, rol: u.rol, activo: u.activo });

module.exports = (app, { db, config, COOKIE }) => {
  const cookie = (valor, maxAgeSeg) =>
    `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeg}${config.produccion ? "; Secure" : ""}`;

  app.post("/api/auth/ingresar", async_(async (req, res) => {
    const usuario = texto(req.body.usuario, 80).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!usuario || !password) throw error(400, "Completá usuario y contraseña");

    const clave = usuario + "|" + req.ip;
    const previo = intentos.get(clave);
    if (previo && previo.hasta > Date.now())
      throw error(429, "Demasiados intentos. Esperá 15 minutos o pedile a un admin que te cambie la contraseña.");

    const u = await db.collection("usuarios").findOne({ usuario });
    const ok = verificarPassword(password, u ? u.hash : HASH_FALSO) && !!u;
    if (!ok) {
      // Si ya había cumplido un bloqueo, vuelve a contar desde cero
      const fallos = (previo && !previo.hasta ? previo.fallos : 0) + 1;
      intentos.set(clave, { fallos, hasta: fallos >= MAX_INTENTOS ? Date.now() + BLOQUEO_MS : 0 });
      throw error(401, "Usuario o contraseña incorrectos");
    }
    if (!u.activo) throw error(403, "Tu usuario no está habilitado. Hablá con un admin.");
    intentos.delete(clave);

    const token = nuevoToken();
    await db.collection("sesiones").insertOne({
      _id: hashToken(token), usuarioId: u._id, creada: new Date(),
      expira: new Date(Date.now() + config.horasSesion * 3600e3),
    });
    req.usuario = u;
    await registrar(db, req, "ingreso");
    res.set("Set-Cookie", cookie(token, config.horasSesion * 3600)).json(perfil(u));
  }));

  app.post("/api/auth/salir", async_(async (req, res) => {
    if (req.sesionId) await db.collection("sesiones").deleteOne({ _id: req.sesionId });
    res.set("Set-Cookie", cookie("", 0)).json({ ok: true });
  }));

  app.get("/api/auth/yo", (req, res) => {
    if (!req.usuario) return res.status(401).json({ error: "Falta iniciar sesión" });
    res.json(perfil(req.usuario));
  });

  app.post("/api/auth/cambiar-password", async_(async (req, res) => {
    if (!req.usuario) throw error(401, "Falta iniciar sesión");
    const { actual, nueva } = req.body;
    if (typeof actual !== "string" || !verificarPassword(actual, req.usuario.hash)) throw error(400, "La contraseña actual no es correcta");
    if (typeof nueva !== "string" || nueva.length < 10) throw error(400, "La contraseña nueva tiene que tener al menos 10 caracteres");
    await db.collection("usuarios").updateOne({ _id: req.usuario._id }, { $set: { hash: hashPassword(nueva) } });
    // Cierra las otras sesiones abiertas de este usuario
    await db.collection("sesiones").deleteMany({ usuarioId: req.usuario._id, _id: { $ne: req.sesionId } });
    await registrar(db, req, "cambio de contraseña propia");
    res.json({ ok: true });
  }));
};

module.exports.perfil = perfil;

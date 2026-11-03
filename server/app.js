// =====================================================================
//  Aplicación Express: seguridad, sesión, rutas de la API (/api/...) y
//  la página (carpeta public/). crearApp() no abre puertos: así las
//  pruebas la pueden levantar con una base de prueba.
// =====================================================================
const path = require("path");
const express = require("express");
const { crearCifrador, hashToken } = require("./cripto");
const { crearCloudinary } = require("./cloudinary");
const { ErrorHttp, error } = require("./util");

const COOKIE = "panelit_sesion";

function leerCookies(header) {
  const out = {};
  String(header || "").split(";").forEach(par => {
    const i = par.indexOf("=");
    if (i > 0) out[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
  });
  return out;
}

function crearApp({ db, config }) {
  const app = express();
  const cifrador = crearCifrador(config.claveCifrado);
  const cloudinary = crearCloudinary(config.cloudinary || {});
  const ctx = { db, config, cifrador, cloudinary, COOKIE };

  app.disable("x-powered-by");
  // Detrás de nginx / proxy del hosting, para que req.ip sea la del usuario
  app.set("trust proxy", 1);

  // Cabeceras de seguridad: la página solo carga lo propio, Google Fonts y las
  // imágenes de Cloudinary (y solo sube imágenes a la API de Cloudinary)
  app.use((req, res, next) => {
    res.set({
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://res.cloudinary.com",
        "connect-src 'self' https://api.cloudinary.com",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ].join("; "),
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    if (config.produccion) res.set("Strict-Transport-Security", "max-age=31536000");
    next();
  });

  app.use("/api", express.json({ limit: "200kb" }));
  app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

  // Contra CSRF: además de la cookie SameSite=Strict, toda escritura tiene que
  // traer esta cabecera (un formulario de otro sitio no puede ponerla)
  app.use("/api", (req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.get("X-Panel-IT") !== "1")
      return next(error(403, "Pedido rechazado"));
    next();
  });

  // Sesión: busca el usuario a partir de la cookie
  app.use("/api", async (req, res, next) => {
    try {
      const token = leerCookies(req.headers.cookie)[COOKIE];
      if (!token) return next();
      const sesion = await db.collection("sesiones").findOne({ _id: hashToken(token) });
      if (!sesion || sesion.expira < new Date()) return next();
      const usuario = await db.collection("usuarios").findOne({ _id: sesion.usuarioId });
      if (!usuario || !usuario.activo) return next();
      req.usuario = usuario;
      req.sesionId = sesion._id;
      // Sesión deslizante: se renueva si se usa (como mucho una vez por minuto)
      const nuevaExpira = new Date(Date.now() + config.horasSesion * 3600e3);
      if (nuevaExpira - sesion.expira > 60e3)
        await db.collection("sesiones").updateOne({ _id: sesion._id }, { $set: { expira: nuevaExpira } });
      next();
    } catch (e) { next(e); }
  });

  require("./rutas/auth")(app, ctx);
  app.use("/api", (req, res, next) => (req.usuario ? next() : next(error(401, "Falta iniciar sesión"))));
  require("./rutas/equipos")(app, ctx);
  require("./rutas/credenciales")(app, ctx);
  require("./rutas/usuarios-servidor")(app, ctx);
  require("./rutas/paginas")(app, ctx);
  require("./rutas/pendientes")(app, ctx);
  require("./rutas/usuarios")(app, ctx);
  require("./rutas/actividad")(app, ctx);

  app.use("/api", (req, res, next) => next(error(404, "No existe")));

  // La página. El modo demo (pruebas/) solo se sirve fuera de producción
  const publica = path.join(__dirname, "..", "public");
  if (config.produccion) app.use("/pruebas", (req, res) => res.status(404).end());
  app.use(express.static(publica, { index: "index.html", dotfiles: "deny", maxAge: config.produccion ? "1h" : 0 }));

  // Manejador central de errores: nunca muestra detalles internos
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ErrorHttp) return res.status(err.estado).json({ error: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Dato con formato inválido" });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "El dato es demasiado grande" });
    if (err.code === 11000) return res.status(409).json({ error: "Ya existe uno con ese nombre" });
    console.error(new Date().toISOString(), req.method, req.originalUrl, err);
    res.status(500).json({ error: "Error del servidor. Probá de nuevo en un rato." });
  });

  return app;
}

module.exports = { crearApp, leerCookies, COOKIE };

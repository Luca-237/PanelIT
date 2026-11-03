// =====================================================================
//  Registro de actividad (solo admin): ingresos, cambios y, sobre todo,
//  quién mostró qué contraseña y cuándo.
// =====================================================================
const { async_, publico, soloRoles } = require("../util");

module.exports = (app, { db }) => {
  app.get("/api/actividad", soloRoles("admin"), async_(async (req, res) => {
    const lista = await db.collection("actividad").find({}).sort({ fecha: -1 }).limit(300).toArray();
    res.json(lista.map(publico));
  }));
};

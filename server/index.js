// =====================================================================
//  Arranque del Panel IT: lee .env, conecta a Atlas y escucha.
//  npm start
// =====================================================================
const { leerConfig } = require("./config");
const { conectar } = require("./db");
const { crearApp } = require("./app");

async function main() {
  const config = leerConfig();
  if (config.faltan.length) {
    console.error("Falta configurar en .env: " + config.faltan.join(", ") + "\nVer .env.ejemplo y GUIA-DESPLIEGUE.md.");
    process.exit(1);
  }
  const { cliente, db } = await conectar(config.mongoUri, config.mongoBase);
  const app = crearApp({ db, config });
  const servidor = app.listen(config.puerto, () => console.log(`Panel IT escuchando en http://localhost:${config.puerto}`));

  const cerrar = () => servidor.close(() => cliente.close().then(() => process.exit(0)));
  process.on("SIGINT", cerrar);
  process.on("SIGTERM", cerrar);
}

main().catch(e => { console.error("No se pudo arrancar:", e.message); process.exit(1); });

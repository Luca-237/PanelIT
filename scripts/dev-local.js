// =====================================================================
//  Prueba local SIN Atlas: levanta un MongoDB en memoria (se borra al
//  cerrar), carga los datos inventados de public/pruebas/datos-demo.js
//  y arranca el panel.
//    npm run dev            → http://localhost:3080  (admin / admin-local-123)
//    npm run dev -- "C:\ruta\EQUIPOS CINDY.xlsx"   → además importa la planilla real
//  Nada de esto toca la base de producción.
// =====================================================================
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
// MongoDB en memoria guarda su binario en node_modules/.cache del proyecto: hay que
// arrancar desde la carpeta del proyecto aunque lo lancen desde otro lado
process.chdir(path.join(__dirname, ".."));
const { MongoMemoryServer } = require("mongodb-memory-server");
const { conectar } = require("../server/db");
const { crearApp } = require("../server/app");
const { hashPassword, crearCifrador } = require("../server/cripto");
const { cargarDemo } = require("./cargar-demo");

async function main() {
  // Si las pruebas ya bajaron el binario, se usa ese (así no vuelve a bajar ~600 MB)
  const cache = path.join("node_modules", ".cache", "mongodb-memory-server");
  const bin = fs.existsSync(cache) && fs.readdirSync(cache).find(a => /^mongod-.+?(\.exe)?$/.test(a) && !a.endsWith(".lock"));
  const mongo = await MongoMemoryServer.create(bin ? { binary: { systemBinary: path.resolve(cache, bin) } } : {});
  const config = {
    puerto: Number(process.env.PORT || process.env.PUERTO || 3080),
    claveCifrado: crypto.randomBytes(32).toString("base64"),
    produccion: false, horasSesion: 12, faltan: [],
  };
  const { db } = await conectar(mongo.getUri(), "panel_it_local");
  const cifrador = crearCifrador(config.claveCifrado);

  await db.collection("usuarios").insertMany([
    { usuario: "admin", nombre: "Admin local", rol: "admin", activo: true, hash: hashPassword("admin-local-123"), creado: new Date() },
    { usuario: "tecnico", nombre: "Técnico local", rol: "tecnico", activo: true, hash: hashPassword("tecnico-local-123"), creado: new Date() },
    { usuario: "consulta", nombre: "Consulta local", rol: "consulta", activo: true, hash: hashPassword("consulta-local-123"), creado: new Date() },
  ]);

  const planilla = process.argv.slice(2).find(a => !a.startsWith("--"));
  if (planilla) {
    const XLSX = require("xlsx");
    const { convertirEquipos, convertirUsuariosServidor, importar } = require("./importar-planilla");
    const libro = XLSX.readFile(planilla);
    const hoja = n => XLSX.utils.sheet_to_json(libro.Sheets[n], { header: 1, raw: true, defval: "" });
    const { equipos } = convertirEquipos(hoja("EQUIPOS"));
    const r = await importar(db, cifrador, { equipos, usuariosSrv: convertirUsuariosServidor(hoja("USUARIOS SERVIDOR")) });
    console.log("Planilla importada en la base en memoria:", r);
  } else {
    await cargarDemo(db, cifrador);
  }

  crearApp({ db, config }).listen(config.puerto, () =>
    console.log(`Panel IT local en http://localhost:${config.puerto}  ·  admin / admin-local-123  ·  tecnico / tecnico-local-123  ·  consulta / consulta-local-123`));
}

main().catch(e => { console.error(e); process.exit(1); });

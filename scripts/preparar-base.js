// =====================================================================
//  Crea (o actualiza) la estructura de la base en Atlas: colecciones con
//  validación de esquema e índices. No toca datos. Se puede repetir.
//    npm run preparar-base
// =====================================================================
const { leerConfig } = require("../server/config");
const { conectar } = require("../server/db");

async function main() {
  const config = leerConfig();
  if (config.faltan.length) throw new Error("Falta configurar en .env: " + config.faltan.join(", "));
  const { cliente, db } = await conectar(config.mongoUri, config.mongoBase);
  try {
    console.log(`Base "${config.mongoBase}" lista:`);
    for (const c of await db.listCollections().toArray()) {
      const idx = await db.collection(c.name).indexes();
      const validada = c.options && c.options.validator ? "con validación" : "sin validación";
      console.log(`  ${c.name.padEnd(18)} ${validada} · índices: ${idx.map(i => i.name).join(", ")} · documentos: ${await db.collection(c.name).estimatedDocumentCount()}`);
    }
  } finally { await cliente.close(); }
}

main().catch(e => { console.error(e.message); process.exit(1); });

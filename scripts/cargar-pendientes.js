// =====================================================================
//  Carga los pendientes de scripts/pendientes-iniciales.js. No pisa nada:
//  si ya hay uno con el mismo título, lo deja como está.
//    npm run cargar-pendientes -- --simular
//    npm run cargar-pendientes
// =====================================================================
const { leerConfig } = require("../server/config");
const { conectar } = require("../server/db");
const INICIALES = require("./pendientes-iniciales");

async function cargar(db, lista, { simular = false } = {}) {
  const col = db.collection("pendientes");
  const r = { creados: 0, existentes: 0, sinVinculo: [] };
  const ahora = new Date(), autor = "Carga inicial (Claude)";
  for (const p of lista) {
    if (await col.findOne({ titulo: p.titulo })) { r.existentes++; continue; }
    const eq = p.equipo ? await db.collection("equipos").findOne({ descripcion: p.equipo }, { projection: { _id: 1 } }) : null;
    const pag = p.pagina ? await db.collection("paginas").findOne({ titulo: p.pagina }, { projection: { _id: 1 } }) : null;
    if (p.equipo && !eq) r.sinVinculo.push(`${p.titulo} → equipo “${p.equipo}”`);
    if (p.pagina && !pag) r.sinVinculo.push(`${p.titulo} → página “${p.pagina}”`);
    if (!simular) await col.insertOne({
      titulo: p.titulo, detalle: p.detalle || "", estado: p.estado, prioridad: p.prioridad, responsable: p.responsable || "",
      equipoId: eq ? eq._id : null, paginaId: pag ? pag._id : null, autor, creado: ahora, actualizado: ahora, actualizadoPor: autor,
      hechoEn: p.estado === "hecho" ? ahora : null,
    });
    r.creados++;
  }
  return r;
}

async function main() {
  const simular = process.argv.includes("--simular");
  const config = leerConfig();
  if (config.faltan.length) throw new Error("Falta configurar en .env: " + config.faltan.join(", "));
  const { cliente, db } = await conectar(config.mongoUri, config.mongoBase);
  try {
    const r = await cargar(db, INICIALES, { simular });
    console.log(`${simular ? "SIMULACIÓN. " : ""}Pendientes nuevos: ${r.creados} · ya existían: ${r.existentes}`);
    if (r.sinVinculo.length) console.log("Vínculos que no se pudieron resolver:\n  " + r.sinVinculo.join("\n  "));
  } finally { await cliente.close(); }
}

module.exports = { cargar };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

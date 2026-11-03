// =====================================================================
//  Importa la planilla "EQUIPOS CINDY.xlsx" (hojas EQUIPOS y USUARIOS
//  SERVIDOR) a la base. Se puede correr varias veces: no duplica (busca
//  los equipos por descripción y las contraseñas por equipo + tipo).
//  Por defecto solo agrega lo que falta: los equipos que ya están en la
//  base NO se tocan, para no pisar lo que se editó en el panel.
//    npm run importar -- "C:\ruta\EQUIPOS CINDY.xlsx" --simular     (solo muestra)
//    npm run importar -- "C:\ruta\EQUIPOS CINDY.xlsx"               (agrega lo nuevo)
//    npm run importar -- "C:\ruta\EQUIPOS CINDY.xlsx" --actualizar  (pisa con la planilla)
//  Nunca imprime contraseñas. La planilla no se copia al proyecto.
// =====================================================================
const { leerConfig } = require("../server/config");
const { conectar } = require("../server/db");
const { crearCifrador } = require("../server/cripto");

const sinAcentos = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function sucursal(valor) {
  const s = sinAcentos(valor);
  if (s.includes("chimola")) return "Chimola";
  if (s.includes("seppey")) return "Depósito P. Seppey";
  if (s.includes("peatonal")) return "Peatonal";
  if (s.includes("homeoffice") || s.includes("home office")) return "Home office";
  if (s.includes("cordoba")) return "Córdoba";
  if (s.includes("central") || s.includes("villa ma")) return "Central";
  return String(valor || "").trim();
}

function tipo(descripcion) {
  const d = sinAcentos(descripcion);
  if (d.includes("servidor")) return "Servidor";
  if (d.includes("notebook")) return "Notebook";
  if (d.includes("all in one") || d.includes("allinone")) return "All in one";
  if (d.includes("mini pc")) return "Mini PC";
  if (d.includes("tablet")) return "Tablet";
  return "PC";
}

// Los IDs vienen como número (1350901742 → "1350901742"); los textos, tal cual
const celda = v => (v === undefined || v === null ? "" : typeof v === "number" ? String(Math.round(v)) : String(v).trim());

// Filas de la hoja EQUIPOS (array de arrays, con encabezado) → equipos + contraseñas
function convertirEquipos(filas) {
  const [enc, ...datos] = filas;
  const col = nombre => enc.findIndex(h => sinAcentos(h).trim() === sinAcentos(nombre));
  const C = {
    descripcion: col("DESCRIPCION"), facturacion: col("FACTURACION"), sucursal: col("SUCURSAL"),
    nombre: col("NOMBRE EQUIPO"), tv: col("ID TEAMVIEWER"), pass: col("CONTRASEÑA"),
    usuario: col("Usuario habitual"), anydesk: col("ANYDESK"), magnus: col("PUNTO VTA MAGNUS"),
    manager: col("PUNTO VTA MANAGER"), servidor: col("USUARIO SERVIDOR"), etiquetas: col("ETIQUETAS"),
  };
  const faltan = Object.entries(C).filter(([, i]) => i < 0).map(([k]) => k);
  if (faltan.length) throw new Error("La hoja EQUIPOS no tiene estas columnas: " + faltan.join(", "));

  const equipos = [], ignoradas = [];
  datos.forEach((f, i) => {
    const descripcion = celda(f[C.descripcion]);
    // Filas sueltas (sin descripción, o con un texto solo en la primera columna): se
    // informan y no se importan, porque pueden ser anotaciones o contraseñas sueltas
    const otras = f.filter((v, j) => j !== C.descripcion && celda(v)).length;
    if (!descripcion || !otras) { if (f.some(v => celda(v))) ignoradas.push(i + 2); return; }
    const teamviewerId = celda(f[C.tv]);
    const password = celda(f[C.pass]);
    equipos.push({
      equipo: {
        descripcion, tipo: tipo(descripcion), sucursal: sucursal(f[C.sucursal]),
        nombreEquipo: celda(f[C.nombre]), usuarioHabitual: celda(f[C.usuario]),
        facturacion: sinAcentos(f[C.facturacion]).startsWith("si"),
        teamviewerId, anydeskId: celda(f[C.anydesk]),
        puntoVentaMagnus: celda(f[C.magnus]), puntoVentaManager: celda(f[C.manager]),
        usuarioServidor: celda(f[C.servidor]), ip: "",
        etiquetas: celda(f[C.etiquetas]) ? [celda(f[C.etiquetas])] : [],
        estado: "activo", observaciones: "",
      },
      // La contraseña de la planilla está al lado del ID de TeamViewer
      credencial: password ? { tipo: teamviewerId ? "teamviewer" : "otra", usuario: "", valor: password } : null,
    });
  });
  return { equipos, ignoradas };
}

function convertirUsuariosServidor(filas) {
  return filas.slice(1).map(f => celda(f[0])).filter(Boolean);
}

async function main() {
  const args = process.argv.slice(2);
  const simular = args.includes("--simular");
  const actualizar = args.includes("--actualizar");
  const archivo = args.find(a => !a.startsWith("--"));
  if (!archivo) throw new Error('Uso: npm run importar -- "C:\\ruta\\EQUIPOS CINDY.xlsx" [--simular]');

  const XLSX = require("xlsx");
  const libro = XLSX.readFile(archivo);
  const hoja = nombre => {
    const n = libro.SheetNames.find(s => sinAcentos(s) === sinAcentos(nombre));
    if (!n) throw new Error(`La planilla no tiene la hoja "${nombre}"`);
    return XLSX.utils.sheet_to_json(libro.Sheets[n], { header: 1, raw: true, defval: "" });
  };
  const { equipos, ignoradas } = convertirEquipos(hoja("EQUIPOS"));
  const usuariosSrv = convertirUsuariosServidor(hoja("USUARIOS SERVIDOR"));

  console.log(`Equipos: ${equipos.length} · con contraseña: ${equipos.filter(e => e.credencial).length} · usuarios del servidor: ${usuariosSrv.length}`);
  const porSucursal = {};
  equipos.forEach(e => { porSucursal[e.equipo.sucursal] = (porSucursal[e.equipo.sucursal] || 0) + 1; });
  console.log("Por sucursal:", porSucursal);
  if (ignoradas.length) console.log(`Filas sin descripción ignoradas (revisarlas a mano en la planilla): ${ignoradas.join(", ")}`);
  if (simular) return console.log("Simulación: no se grabó nada.");

  const config = leerConfig();
  if (config.faltan.length) throw new Error("Falta configurar en .env: " + config.faltan.join(", "));
  const cifrador = crearCifrador(config.claveCifrado);
  const { cliente, db } = await conectar(config.mongoUri, config.mongoBase);
  try {
    const r = await importar(db, cifrador, { equipos, usuariosSrv }, { actualizar });
    console.log(`Grabado: ${r.equiposNuevos} equipos nuevos, ${r.equiposActualizados} actualizados, ${r.equiposSinTocar} que ya estaban (sin tocar), ${r.credenciales} contraseñas, ${r.usuariosNuevos} usuarios del servidor nuevos.`);
  } finally { await cliente.close(); }
}

async function importar(db, cifrador, { equipos, usuariosSrv }, { actualizar = false } = {}) {
  const r = { equiposNuevos: 0, equiposActualizados: 0, equiposSinTocar: 0, credenciales: 0, usuariosNuevos: 0 };
  const ahora = new Date();
  for (const { equipo, credencial } of equipos) {
    if (!actualizar && await db.collection("equipos").findOne({ descripcion: equipo.descripcion })) { r.equiposSinTocar++; continue; }
    const res = await db.collection("equipos").findOneAndUpdate(
      { descripcion: equipo.descripcion },
      { $set: { ...equipo, actualizado: ahora, actualizadoPor: "Importación de planilla" }, $setOnInsert: { creado: ahora } },
      { upsert: true, returnDocument: "after", includeResultMetadata: true });
    if (res.lastErrorObject.updatedExisting) r.equiposActualizados++; else r.equiposNuevos++;
    if (credencial) {
      await db.collection("credenciales").updateOne(
        { equipoId: res.value._id, tipo: credencial.tipo },
        { $set: { usuario: credencial.usuario, secreto: cifrador.cifrar(credencial.valor), actualizado: ahora, actualizadoPor: "Importación de planilla" } },
        { upsert: true });
      r.credenciales++;
    }
  }
  for (const nombre of usuariosSrv) {
    const u = await db.collection("usuarios_servidor").updateOne(
      { nombreClave: nombre.toLowerCase() }, { $setOnInsert: { nombre, nombreClave: nombre.toLowerCase(), notas: "" } }, { upsert: true });
    if (u.upsertedCount) r.usuariosNuevos++;
  }
  return r;
}

module.exports = { convertirEquipos, convertirUsuariosServidor, importar, sucursal, tipo };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

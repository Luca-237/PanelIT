// =====================================================================
//  Crea (o reactiva y le cambia la contraseña a) un usuario admin.
//  Se usa una sola vez, para el primer admin; los demás se crean desde
//  la página (Usuarios).
//    npm run crear-admin -- <usuario> "<Nombre a mostrar>"
//  La contraseña se pide por teclado (no queda en el historial). Sin teclado
//  (scripts), se toma de la variable ADMIN_PASSWORD.
// =====================================================================
const readline = require("readline");
const { leerConfig } = require("../server/config");
const { conectar } = require("../server/db");
const { hashPassword } = require("../server/cripto");

function preguntarOculto(pregunta) {
  return new Promise(ok => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(pregunta)) rl.output.write(s); };
    rl.question(pregunta, r => { rl.close(); process.stdout.write("\n"); ok(r); });
  });
}

async function main() {
  const [usuario, nombre] = process.argv.slice(2);
  if (!usuario || !nombre) throw new Error('Uso: npm run crear-admin -- <usuario> "<Nombre>"');
  const config = leerConfig();
  if (config.faltan.length) throw new Error("Falta configurar en .env: " + config.faltan.join(", "));

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await preguntarOculto("Contraseña (mínimo 10 caracteres): ");
    if (password.length >= 10 && (await preguntarOculto("Repetila: ")) !== password) throw new Error("No coinciden");
  }
  if (password.length < 10) throw new Error("La contraseña tiene que tener al menos 10 caracteres");

  const { cliente, db } = await conectar(config.mongoUri, config.mongoBase);
  try {
    await db.collection("usuarios").updateOne(
      { usuario: usuario.toLowerCase() },
      { $set: { nombre, rol: "admin", activo: true, hash: hashPassword(password) }, $setOnInsert: { creado: new Date() } },
      { upsert: true });
    console.log(`Listo: ${usuario.toLowerCase()} es admin.`);
  } finally { await cliente.close(); }
}

main().catch(e => { console.error(e.message); process.exit(1); });

// =====================================================================
//  Pruebas de la API contra un MongoDB en memoria (npm test).
//  La primera vez baja el binario de MongoDB (~100 MB, queda en caché).
// =====================================================================
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { conectar } = require("../server/db");
const { crearApp } = require("../server/app");
const { hashPassword, crearCifrador } = require("../server/cripto");
const { cargarDemo } = require("../scripts/cargar-demo");
const { convertirEquipos, sucursal, tipo } = require("../scripts/importar-planilla");

let mongo, cliente, db, servidor, base;

before(async () => {
  mongo = await MongoMemoryServer.create();
  ({ cliente, db } = await conectar(mongo.getUri(), "panel_it_test"));
  const config = { claveCifrado: crypto.randomBytes(32).toString("base64"), produccion: false, horasSesion: 12,
    cloudinary: { cloudName: "nube-prueba", apiKey: "123", apiSecret: "secreto-prueba", carpeta: "panel-it" } };
  await db.collection("usuarios").insertMany([
    { usuario: "admin", nombre: "Admin", rol: "admin", activo: true, hash: hashPassword("clave-admin-1") },
    { usuario: "tec", nombre: "Técnico", rol: "tecnico", activo: true, hash: hashPassword("clave-tec-12") },
    { usuario: "ver", nombre: "Consulta", rol: "consulta", activo: true, hash: hashPassword("clave-ver-12") },
    { usuario: "bloq", nombre: "Para bloquear", rol: "consulta", activo: true, hash: hashPassword("clave-bloq-1") },
    { usuario: "baja", nombre: "De baja", rol: "tecnico", activo: false, hash: hashPassword("clave-baja-1") },
  ]);
  await cargarDemo(db, crearCifrador(config.claveCifrado));
  servidor = crearApp({ db, config }).listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => { servidor.close(); await cliente.close(); await mongo.stop(); });

// Cliente mínimo con cookie de sesión
function sesion() {
  let cookie = "";
  const pedir = async (metodo, ruta, cuerpo, { sinCabecera = false } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (!sinCabecera) headers["X-Panel-IT"] = "1";
    if (cookie) headers.Cookie = cookie;
    const r = await fetch(base + ruta, { method: metodo, headers, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const set = r.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const datos = (r.headers.get("content-type") || "").includes("json") ? await r.json() : null;
    return { estado: r.status, datos, headers: r.headers };
  };
  return {
    pedir,
    async ingresar(usuario, password) { return pedir("POST", "/api/auth/ingresar", { usuario, password }); },
  };
}

async function como(usuario, password) {
  const s = sesion();
  const r = await s.ingresar(usuario, password);
  assert.equal(r.estado, 200, JSON.stringify(r.datos));
  return s;
}

test("sin sesión no se ve nada", async () => {
  const s = sesion();
  for (const ruta of ["/api/equipos", "/api/paginas", "/api/imagenes/estado", "/api/usuarios-servidor", "/api/usuarios", "/api/actividad"])
    assert.equal((await s.pedir("GET", ruta)).estado, 401, ruta);
});

test("login: datos malos, usuario inexistente, desactivado y cookie segura", async () => {
  const s = sesion();
  assert.equal((await s.ingresar("admin", "mala")).estado, 401);
  assert.equal((await s.ingresar("nadie", "clave-admin-1")).estado, 401);
  assert.equal((await s.ingresar("baja", "clave-baja-1")).estado, 403);
  const ok = await s.ingresar("ADMIN", "clave-admin-1");
  assert.equal(ok.estado, 200);
  assert.equal(ok.datos.rol, "admin");
  assert.equal(ok.datos.hash, undefined);
  assert.match(ok.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal((await s.pedir("GET", "/api/auth/yo")).datos.usuario, "admin");
  await s.pedir("POST", "/api/auth/salir");
  assert.equal((await s.pedir("GET", "/api/equipos")).estado, 401);
});

test("bloqueo tras 5 intentos fallidos", async () => {
  const s = sesion();
  for (let i = 0; i < 5; i++) assert.equal((await s.ingresar("bloq", "x")).estado, 401);
  assert.equal((await s.ingresar("bloq", "clave-bloq-1")).estado, 429);
});

test("escrituras sin la cabecera X-Panel-IT se rechazan (CSRF)", async () => {
  const s = await como("admin", "clave-admin-1");
  const r = await s.pedir("POST", "/api/paginas", { titulo: "x" }, { sinCabecera: true });
  assert.equal(r.estado, 403);
});

test("equipos: listar, alta, validación, edición y permisos por rol", async () => {
  const admin = await como("admin", "clave-admin-1");
  const ver = await como("ver", "clave-ver-12");
  const lista = await ver.pedir("GET", "/api/equipos");
  assert.equal(lista.estado, 200);
  assert.ok(lista.datos.length >= 14);
  const caja = lista.datos.find(e => e.descripcion === "PC Caja 1");
  assert.equal(caja.credenciales, 1);
  assert.equal(caja.secreto, undefined);

  assert.equal((await ver.pedir("POST", "/api/equipos", { descripcion: "X" })).estado, 403);
  assert.equal((await admin.pedir("POST", "/api/equipos", { descripcion: "" })).estado, 400);
  assert.equal((await admin.pedir("POST", "/api/equipos", { descripcion: "X", tipo: "Heladera" })).estado, 400);

  const alta = await admin.pedir("POST", "/api/equipos", { descripcion: "PC nueva", sucursal: "Central", facturacion: true, etiquetas: "a, b, a" });
  assert.equal(alta.estado, 201);
  assert.deepEqual(alta.datos.etiquetas, ["a", "b"]);
  const tec = await como("tec", "clave-tec-12");
  const ed = await tec.pedir("PUT", `/api/equipos/${alta.datos.id}`, { ...alta.datos, estado: "reparacion" });
  assert.equal(ed.estado, 200);
  assert.equal(ed.datos.estado, "reparacion");
  assert.equal(ed.datos.actualizadoPor, "Técnico");
  assert.equal((await tec.pedir("DELETE", `/api/equipos/${alta.datos.id}`)).estado, 403);
  assert.equal((await admin.pedir("PUT", "/api/equipos/no-es-un-id", { descripcion: "x" })).estado, 404);
  assert.equal((await admin.pedir("DELETE", `/api/equipos/${alta.datos.id}`)).estado, 200);
});

test("contraseñas: solo admin, cifradas en la base, y mostrarlas queda registrado", async () => {
  const admin = await como("admin", "clave-admin-1");
  const tec = await como("tec", "clave-tec-12");
  const caja = (await admin.pedir("GET", "/api/equipos")).datos.find(e => e.descripcion === "PC Caja 1");

  assert.equal((await tec.pedir("GET", `/api/equipos/${caja.id}/credenciales`)).estado, 403);
  const lista = await admin.pedir("GET", `/api/equipos/${caja.id}/credenciales`);
  assert.equal(lista.datos.length, 1);
  assert.equal(lista.datos[0].valor, undefined);
  assert.equal(lista.datos[0].secreto, undefined);

  // En la base no está en texto plano
  const crudo = JSON.stringify(await db.collection("credenciales").find({}).toArray());
  assert.ok(!crudo.includes("demo-tv-1"));

  assert.equal((await tec.pedir("POST", `/api/credenciales/${lista.datos[0].id}/revelar`)).estado, 403);
  const rev = await admin.pedir("POST", `/api/credenciales/${lista.datos[0].id}/revelar`);
  assert.equal(rev.datos.valor, "demo-tv-1");

  const nueva = await admin.pedir("POST", `/api/equipos/${caja.id}/credenciales`, { tipo: "windows", usuario: "cajero", valor: "Win-123" });
  assert.equal(nueva.estado, 201);
  // Editar sin mandar valor deja la contraseña anterior
  await admin.pedir("PUT", `/api/credenciales/${nueva.datos.id}`, { tipo: "windows", usuario: "cajero2" });
  assert.equal((await admin.pedir("POST", `/api/credenciales/${nueva.datos.id}/revelar`)).datos.valor, "Win-123");
  assert.equal((await admin.pedir("DELETE", `/api/credenciales/${nueva.datos.id}`)).estado, 200);

  const act = await admin.pedir("GET", "/api/actividad");
  assert.ok(act.datos.some(a => a.accion === "contraseña mostrada" && a.detalle.includes("PC Caja 1")));
  assert.equal((await tec.pedir("GET", "/api/actividad")).estado, 403);
});

test("páginas: guía inicial sembrada, subpáginas, bloques, mover y borrar en cascada", async () => {
  const tec = await como("tec", "clave-tec-12");
  const ver = await como("ver", "clave-ver-12");
  const lista = await ver.pedir("GET", "/api/paginas");
  assert.equal(lista.estado, 200);
  const guia = lista.datos.paginas.find(p => p.id === lista.datos.guiaId);
  assert.equal(guia.titulo, "Conexión con el servidor");
  assert.equal(guia.bloques, undefined);   // el listado no trae el contenido
  const completa = await ver.pedir("GET", `/api/paginas/${guia.id}`);
  assert.ok(completa.datos.bloques.some(b => b.tipo === "titulo" && b.texto === "Cómo funciona"));
  assert.ok(completa.datos.bloques.some(b => b.tipo === "lista"));
  // Volver a pedir la lista no la vuelve a crear
  const otra = await ver.pedir("GET", "/api/paginas");
  assert.equal(otra.datos.paginas.filter(p => p.titulo === "Conexión con el servidor").length, 1);

  assert.equal((await ver.pedir("POST", "/api/paginas", { titulo: "x" })).estado, 403);
  const padre = await tec.pedir("POST", "/api/paginas", { titulo: "Padre" });
  assert.equal(padre.estado, 201);
  const hija = await tec.pedir("POST", "/api/paginas", { titulo: "Hija", padreId: padre.datos.id });
  const nieta = await tec.pedir("POST", "/api/paginas", { titulo: "Nieta", padreId: hija.datos.id });
  assert.equal(hija.datos.padreId, padre.datos.id);

  const g = await tec.pedir("PUT", `/api/paginas/${padre.datos.id}`, { titulo: "Padre editado", bloques: [
    { tipo: "texto", texto: "hola" }, { tipo: "tareas", texto: "[x] uno\n[ ] dos" },
    { tipo: "subpagina", paginaId: hija.datos.id }, { tipo: "aviso", color: "violeta", texto: "ojo" }] });
  assert.equal(g.estado, 200);
  assert.equal(g.datos.bloques.length, 4);
  assert.ok(g.datos.bloques.every(b => b.id));
  assert.equal(g.datos.bloques[3].color, "naranja");
  assert.equal(g.datos.actualizadoPor, "Técnico");
  assert.equal((await tec.pedir("PUT", `/api/paginas/${padre.datos.id}`, { bloques: [{ tipo: "script", texto: "x" }] })).estado, 400);
  assert.equal((await ver.pedir("PUT", `/api/paginas/${padre.datos.id}`, { titulo: "x" })).estado, 403);

  // No se puede mover una página adentro de su propia nieta
  assert.equal((await tec.pedir("PUT", `/api/paginas/${padre.datos.id}`, { padreId: nieta.datos.id })).estado, 400);
  // Mover la nieta a la raíz sí
  assert.equal((await tec.pedir("PUT", `/api/paginas/${nieta.datos.id}`, { padreId: null })).datos.padreId, null);

  // Atada a un equipo: aparece filtrando por equipo
  const eq = (await tec.pedir("GET", "/api/equipos")).datos[0];
  await tec.pedir("PUT", `/api/paginas/${hija.datos.id}`, { equipoId: eq.id });
  const delEquipo = await ver.pedir("GET", `/api/paginas?equipo=${eq.id}`);
  assert.ok(delEquipo.datos.paginas.some(p => p.id === hija.datos.id));

  const b = await tec.pedir("DELETE", `/api/paginas/${padre.datos.id}`);
  assert.equal(b.datos.borradas, 2);   // padre + hija (la nieta ya estaba en la raíz)
  assert.equal((await ver.pedir("GET", `/api/paginas/${hija.datos.id}`)).estado, 404);
  assert.equal((await ver.pedir("GET", `/api/paginas/${nieta.datos.id}`)).estado, 200);
});

test("imágenes: firma de Cloudinary solo para quien edita, y solo URLs de nuestra cuenta", async () => {
  const tec = await como("tec", "clave-tec-12");
  const ver = await como("ver", "clave-ver-12");
  assert.equal((await ver.pedir("POST", "/api/imagenes/firma")).estado, 403);
  const f = await tec.pedir("POST", "/api/imagenes/firma");
  assert.equal(f.estado, 200);
  assert.equal(f.datos.cloudName, "nube-prueba");
  assert.equal(f.datos.folder, "panel-it");
  assert.ok(!JSON.stringify(f.datos).includes("secreto-prueba"));
  // La firma es SHA-1 de los parámetros ordenados + secret
  const esperada = crypto.createHash("sha1").update(`allowed_formats=${f.datos.allowed_formats}&folder=panel-it&timestamp=${f.datos.timestamp}secreto-prueba`).digest("hex");
  assert.equal(f.datos.signature, esperada);

  const p = await tec.pedir("POST", "/api/paginas", { titulo: "Con foto" });
  const buena = { tipo: "imagen", url: "https://res.cloudinary.com/nube-prueba/image/upload/v1/panel-it/abc.jpg", publicId: "panel-it/abc", texto: "rack" };
  assert.equal((await tec.pedir("PUT", `/api/paginas/${p.datos.id}`, { bloques: [buena] })).estado, 200);
  assert.equal((await tec.pedir("PUT", `/api/paginas/${p.datos.id}`, { bloques: [{ ...buena, url: "https://otro.com/x.jpg" }] })).estado, 400);
  assert.equal((await tec.pedir("PUT", `/api/paginas/${p.datos.id}`, { bloques: [{ ...buena, url: "https://res.cloudinary.com/otra-cuenta/image/upload/v1/panel-it/abc.jpg" }] })).estado, 400);
});

test("usuarios del servidor: alta, repetido y baja", async () => {
  const tec = await como("tec", "clave-tec-12");
  const r = await tec.pedir("POST", "/api/usuarios-servidor", { nombre: "cordoba5" });
  assert.equal(r.estado, 201);
  assert.equal((await tec.pedir("POST", "/api/usuarios-servidor", { nombre: "CORDOBA5" })).estado, 409);
  assert.equal((await tec.pedir("DELETE", `/api/usuarios-servidor/${r.datos.id}`)).estado, 200);
});

test("usuarios del panel: alta, contraseña corta, siempre queda un admin", async () => {
  const admin = await como("admin", "clave-admin-1");
  const tec = await como("tec", "clave-tec-12");
  assert.equal((await tec.pedir("GET", "/api/usuarios")).estado, 403);
  assert.equal((await admin.pedir("POST", "/api/usuarios", { usuario: "nuevo", nombre: "N", rol: "consulta", password: "corta" })).estado, 400);
  assert.equal((await admin.pedir("POST", "/api/usuarios", { usuario: "con espacio", nombre: "N", rol: "consulta", password: "suficiente-larga" })).estado, 400);
  const nuevo = await admin.pedir("POST", "/api/usuarios", { usuario: "nuevo", nombre: "Nuevo", rol: "consulta", password: "suficiente-larga" });
  assert.equal(nuevo.estado, 201);
  assert.equal((await admin.pedir("POST", "/api/usuarios", { usuario: "nuevo", nombre: "Otro", rol: "consulta", password: "suficiente-larga" })).estado, 409);
  await como("nuevo", "suficiente-larga");

  const yo = (await admin.pedir("GET", "/api/auth/yo")).datos;
  const r = await admin.pedir("PUT", `/api/usuarios/${yo.id}`, { nombre: "Admin", rol: "consulta", activo: true });
  assert.equal(r.estado, 400);
  assert.match(r.datos.error, /al menos un admin/);

  // Desactivar cierra sus sesiones
  const s = await como("nuevo", "suficiente-larga");
  await admin.pedir("PUT", `/api/usuarios/${nuevo.datos.id}`, { nombre: "Nuevo", rol: "consulta", activo: false });
  assert.equal((await s.pedir("GET", "/api/equipos")).estado, 401);
});

test("cambiar la contraseña propia", async () => {
  const s = await como("ver", "clave-ver-12");
  assert.equal((await s.pedir("POST", "/api/auth/cambiar-password", { actual: "mal", nueva: "otra-clave-larga" })).estado, 400);
  assert.equal((await s.pedir("POST", "/api/auth/cambiar-password", { actual: "clave-ver-12", nueva: "otra-clave-larga" })).estado, 200);
  await como("ver", "otra-clave-larga");
});

test("cabeceras de seguridad en la página", async () => {
  const r = await fetch(base + "/");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-security-policy"), /script-src 'self'/);
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(r.headers.get("x-powered-by"), null);
});

test("importación: sucursales, tipos y filas sueltas", () => {
  assert.equal(sucursal("VIlla Maria - Central"), "Central");
  assert.equal(sucursal("Villa Maira - Central"), "Central");
  assert.equal(sucursal("Villa Maria - Deposito P. Seppey"), "Depósito P. Seppey");
  assert.equal(sucursal("VIlla Maria - Homeoffice"), "Home office");
  assert.equal(sucursal("Cordoba"), "Córdoba");
  assert.equal(tipo("Allinone consultas salon"), "All in one");
  assert.equal(tipo("Servidor datos"), "Servidor");
  const enc = ["DESCRIPCION", "FACTURACION", "SUCURSAL", "NOMBRE EQUIPO", "ID TEAMVIEWER", "CONTRASEÑA", "Usuario habitual", "ANYDESK", "PUNTO VTA MAGNUS", "PUNTO VTA MANAGER", "USUARIO SERVIDOR", "ETIQUETAS"];
  const { equipos, ignoradas } = convertirEquipos([enc,
    ["PC Caja", "si", "Villa Maria - Central", "PC1", 311997591, "x-1", "Carlos", 339507124, 5, 105, "PC1", "OK"],
    ["Sin TV", "no", "Cordoba", "", "", "y-2", "", 1, "", "", "", ""],
    ["", "", "", "", "", "", "", "algo", "", "", "", ""],
    ["texto suelto", "", "", "", "", "", "", "", "", "", "", ""],
  ]);
  assert.equal(equipos.length, 2);
  assert.deepEqual(ignoradas, [4, 5]);
  assert.equal(equipos[0].equipo.teamviewerId, "311997591");
  assert.equal(equipos[0].equipo.facturacion, true);
  assert.equal(equipos[0].equipo.puntoVentaManager, "105");
  assert.deepEqual(equipos[0].credencial, { tipo: "teamviewer", usuario: "", valor: "x-1" });
  assert.equal(equipos[1].credencial.tipo, "otra");
});

test("pendientes: todos ven, admin y técnico editan, fecha de hecho y vínculos válidos", async () => {
  const tec = await como("tec", "clave-tec-12");
  const ver = await como("ver", "otra-clave-larga");
  assert.equal((await ver.pedir("GET", "/api/pendientes")).estado, 200);
  assert.equal((await ver.pedir("POST", "/api/pendientes", { titulo: "x" })).estado, 403);
  assert.equal((await tec.pedir("POST", "/api/pendientes", { titulo: "" })).estado, 400);
  assert.equal((await tec.pedir("POST", "/api/pendientes", { titulo: "x", estado: "listo" })).estado, 400);
  assert.equal((await tec.pedir("POST", "/api/pendientes", { titulo: "x", prioridad: "urgente" })).estado, 400);
  assert.equal((await tec.pedir("POST", "/api/pendientes", { titulo: "x", equipoId: "000000000000000000000000" })).estado, 400);
  const eq = (await tec.pedir("GET", "/api/equipos")).datos[0];
  const n = await tec.pedir("POST", "/api/pendientes", { titulo: "Cambiar el disco", detalle: "SSD", prioridad: "alta", responsable: "Luca", equipoId: eq.id });
  assert.equal(n.estado, 201);
  assert.equal(n.datos.estado, "pendiente");
  assert.equal(n.datos.hechoEn, null);
  const hecho = await tec.pedir("PUT", `/api/pendientes/${n.datos.id}`, { ...n.datos, estado: "hecho" });
  assert.equal(hecho.datos.estado, "hecho");
  assert.ok(hecho.datos.hechoEn);
  const volver = await tec.pedir("PUT", `/api/pendientes/${n.datos.id}`, { ...n.datos, estado: "en_curso" });
  assert.equal(volver.datos.hechoEn, null);
  assert.ok((await ver.pedir("GET", "/api/pendientes")).datos.some(p => p.id === n.datos.id && p.equipoId === eq.id));
  assert.equal((await ver.pedir("DELETE", `/api/pendientes/${n.datos.id}`)).estado, 403);
  assert.equal((await tec.pedir("DELETE", `/api/pendientes/${n.datos.id}`)).estado, 200);
  assert.equal((await tec.pedir("DELETE", `/api/pendientes/${n.datos.id}`)).estado, 404);
});

test("contenido inicial: se carga completo, con subpáginas válidas, y no se duplica", async () => {
  const { cargar } = require("../scripts/cargar-contenido");
  const CONTENIDO = require("../scripts/contenido-inicial");
  const { TIPOS } = require("../server/rutas/paginas");
  const contar = ps => ps.reduce((n, p) => n + 1 + contar(p.hijas || []), 0);
  const recorrer = (ps, f) => ps.forEach(p => { f(p); recorrer(p.hijas || [], f); });
  recorrer(CONTENIDO, p => p.bloques.forEach(b => {
    assert.ok(TIPOS.includes(b.tipo), "tipo inválido en " + p.titulo + ": " + b.tipo);
    assert.ok(typeof b.texto === "string" && b.texto.length < 20000, "texto inválido en " + p.titulo);
    // Sin claves ni contraseñas escritas en el contenido
    assert.ok(!/(password|contraseña)s*[:=]s*S{6,}/i.test(b.texto), "posible secreto en " + p.titulo);
  }));
  const antes = await db.collection("paginas").countDocuments();
  const r1 = await cargar(db, CONTENIDO);
  assert.equal(r1.creadas.length, contar(CONTENIDO));
  assert.equal(await db.collection("paginas").countDocuments(), antes + contar(CONTENIDO));
  assert.equal(r1.guiaMovida, true);
  const r2 = await cargar(db, CONTENIDO);
  assert.equal(r2.creadas.length, 0);
  assert.equal(await db.collection("paginas").countDocuments(), antes + contar(CONTENIDO));
  // Cada enlace a subpágina apunta a una página que existe
  const todas = await db.collection("paginas").find({}).toArray();
  const ids = new Set(todas.map(p => String(p._id)));
  todas.forEach(p => p.bloques.filter(b => b.tipo === "subpagina").forEach(b => assert.ok(ids.has(b.paginaId), "enlace roto en " + p.titulo)));
  // La guía quedó adentro de la página del servidor y la API la lee
  const admin = await como("admin", "clave-admin-1");
  const lista = await admin.pedir("GET", "/api/paginas");
  const guia = lista.datos.paginas.find(p => p.id === lista.datos.guiaId);
  assert.equal(lista.datos.paginas.find(p => p.id === guia.padreId).titulo, "Conexión al servidor y a las impresoras");
  const g = await admin.pedir("GET", "/api/paginas/" + guia.id);
  assert.ok(g.datos.bloques.some(b => b.texto.includes("a confirmar: el router")));
});

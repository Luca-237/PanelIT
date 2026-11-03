// =====================================================================
//  Arranque: verifica la sesión, carga equipos y usuarios del servidor,
//  y maneja la navegación entre secciones (#tablero, #equipos, …).
// =====================================================================
(function (R) {
  const { $, esc, norm, toast } = R.util;
  const A = R.vistaAcceso;
  const VISTAS = {
    tablero: () => R.vistaTablero,
    equipos: () => R.vistaEquipos,
    servidor: () => R.vistaServidor,
    pendientes: () => R.vistaPendientes,
    pagina: () => R.vistaPaginas,
    usuarios: () => R.vistaUsuarios,
    actividad: () => R.vistaActividad,
  };
  const SOLO_ADMIN = ["usuarios", "actividad"];
  const NOMBRES = { tablero: "Tablero", equipos: "Equipos", servidor: "Conexión al servidor", pendientes: "Pendientes", usuarios: "Usuarios del panel", actividad: "Actividad" };
  const TIPOS = ["PC", "Notebook", "All in one", "Mini PC", "Tablet", "Servidor", "Otro"];
  // Tipos que entran a Manager por Escritorio remoto (los servidores y tablets no)
  const USAN_SERVIDOR = ["PC", "Notebook", "All in one", "Mini PC"];
  const ESTADOS = { activo: "Activo", reparacion: "En reparación", baja: "De baja" };
  let vistaActual = null;

  // ---------- Ayudas compartidas por las vistas ----------
  const app = {
    TIPOS, ESTADOS, USAN_SERVIDOR,
    esAdmin: () => R.estado.perfil && R.estado.perfil.rol === "admin",
    puedeEditar: () => R.estado.perfil && ["admin", "tecnico"].includes(R.estado.perfil.rol),
    equipo: id => R.estado.equipos.find(e => e.id === id),
    vigentes: () => R.estado.equipos.filter(e => e.estado !== "baja"),
    sucursales() {
      return [...new Set(R.estado.equipos.map(e => e.sucursal).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    },
    chipEstado: estado => `<span class="chip estado-${esc(estado)}">${esc(ESTADOS[estado] || estado)}</span>`,

    // Uso de cada usuario del servidor: { clave → { nombre, enLista, equipos[] } } (solo equipos no dados de baja)
    usoServidor() {
      const uso = new Map();
      R.estado.usuariosServidor.forEach(u => uso.set(norm(u.nombre), { nombre: u.nombre, id: u.id, notas: u.notas, enLista: true, equipos: [] }));
      app.vigentes().forEach(e => {
        if (!e.usuarioServidor) return;
        const k = norm(e.usuarioServidor);
        if (!uso.has(k)) uso.set(k, { nombre: e.usuarioServidor, enLista: false, equipos: [] });
        uso.get(k).equipos.push(e);
      });
      return uso;
    },

    // Lo que conviene revisar: [{ texto, detalle, equipos[] }]
    paraRevisar() {
      const avisos = [];
      const vig = app.vigentes();
      app.usoServidor().forEach(u => {
        // "administrador" lo comparten los servidores a propósito
        const comunes = u.equipos.filter(e => USAN_SERVIDOR.includes(e.tipo));
        if (comunes.length > 1) avisos.push({ texto: `Usuario del servidor "${u.nombre}" en ${comunes.length} equipos`, detalle: "Si se conectan a la vez, uno le cierra la sesión al otro.", equipos: comunes });
        if (!u.enLista && u.equipos.length) avisos.push({ texto: `"${u.nombre}" no está en la lista de usuarios del servidor`, detalle: "Puede estar mal escrito o faltar en la lista.", equipos: u.equipos });
      });
      const pv = new Map();
      vig.filter(e => e.facturacion && e.puntoVentaManager).forEach(e => {
        if (!pv.has(e.puntoVentaManager)) pv.set(e.puntoVentaManager, []);
        pv.get(e.puntoVentaManager).push(e);
      });
      pv.forEach((es, n) => { if (es.length > 1) avisos.push({ texto: `Punto de venta Manager ${n} en ${es.length} cajas`, detalle: "Dos cajas con el mismo punto de venta pueden pisarse la numeración.", equipos: es }); });
      const sinUsuario = vig.filter(e => USAN_SERVIDOR.includes(e.tipo) && !e.usuarioServidor);
      if (sinUsuario.length) avisos.push({ texto: `${sinUsuario.length} equipo(s) sin usuario del servidor`, detalle: "No se sabe con qué usuario entran a Manager.", equipos: sinUsuario });
      const sinRemoto = vig.filter(e => !e.teamviewerId && !e.anydeskId && e.tipo !== "Tablet");
      if (sinRemoto.length) avisos.push({ texto: `${sinRemoto.length} equipo(s) sin acceso remoto`, detalle: "Sin ID de AnyDesk ni de TeamViewer.", equipos: sinRemoto });
      const sinNombre = vig.filter(e => !e.nombreEquipo && e.tipo !== "Tablet");
      if (sinNombre.length) avisos.push({ texto: `${sinNombre.length} equipo(s) sin nombre de Windows`, detalle: "Cuesta encontrarlos en la red.", equipos: sinNombre });
      const reparacion = vig.filter(e => e.estado === "reparacion");
      if (reparacion.length) avisos.push({ texto: `${reparacion.length} equipo(s) en reparación`, detalle: "", equipos: reparacion });
      return avisos;
    },

    // Ubicación en la barra superior (el HTML lo arma quien llama, ya escapado)
    ruta(html) { $("ruta").innerHTML = html.includes("<") ? html : `<span>${esc(html)}</span>`; },
    async recargarPendientes() { R.estado.pendientes = await R.api.pendientes.listar(); R.vistaPendientes.actualizarInsignia(); },
    async recargarPaginas() { const r = await R.api.paginas.listar(); R.estado.paginas = r.paginas; R.estado.guiaId = r.guiaId; },
    async recargarEquipos() { R.estado.equipos = await R.api.equipos.listar(); app.pintarListas(); },
    async recargarUsuariosServidor() { R.estado.usuariosServidor = await R.api.usuariosServidor.listar(); app.pintarListas(); },
    // Sugerencias de los campos de sucursal y usuario del servidor
    pintarListas() {
      $("lista-sucursales").innerHTML = app.sucursales().map(s => `<option value="${esc(s)}">`).join("");
      $("lista-usuarios-servidor").innerHTML = R.estado.usuariosServidor.map(u => `<option value="${esc(u.nombre)}">`).join("");
    },
    refrescar() { if (vistaActual) VISTAS[vistaActual]().mostrar(); },
  };
  R.app = app;

  function ir() {
    const [clave, param] = (location.hash.replace("#", "") || "tablero").split("/");
    let nombre = clave;
    if (!VISTAS[nombre] || (SOLO_ADMIN.includes(nombre) && !app.esAdmin())) nombre = "tablero";
    // Lo que se estaba escribiendo en una página se guarda antes de irse
    if (vistaActual === "pagina" && nombre !== "pagina") R.vistaPaginas.guardarPendiente();
    vistaActual = nombre;
    document.querySelectorAll("[data-seccion]").forEach(s => { s.hidden = s.id !== "vista-" + nombre; });
    document.querySelectorAll(".lateral a.item").forEach(a => a.classList.toggle("activo", a.dataset.vista === nombre));
    if (nombre !== "pagina") { $("estado-guardado").textContent = ""; app.ruta(NOMBRES[nombre]); R.vistaPaginas.pintarArbol(); }
    $("lateral").classList.remove("abierto");
    $("velo-menu").hidden = true;
    window.scrollTo(0, 0);
    VISTAS[nombre]().mostrar(nombre === "pagina" ? param : undefined);
  }

  async function entrar(perfil) {
    A.mostrar("pantalla-carga");
    R.estado.perfil = perfil;
    A.mostrarUsuario(perfil);
    try {
      const [equipos, usuariosServidor, pags, imagenes] = await Promise.all([
        R.api.equipos.listar(), R.api.usuariosServidor.listar(), R.api.paginas.listar(), R.api.imagenes.estado().catch(() => false)]);
      R.estado.pendientes = await R.api.pendientes.listar().catch(() => []);
      Object.assign(R.estado, { equipos, usuariosServidor, paginas: pags.paginas, guiaId: pags.guiaId, imagenes });
      R.vistaPendientes.actualizarInsignia();
      app.pintarListas();
    } catch (e) { toast(e.message, "error", 6000); }
    A.mostrar("app");
    ir();
  }

  function salir() {
    R.estado = estadoInicial();
    vistaActual = null;
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
    A.mostrar("pantalla-login");
  }

  const estadoInicial = () => ({ perfil: null, equipos: [], usuariosServidor: [], paginas: [], guiaId: null, imagenes: false, pendientes: [] });

  async function arrancar() {
    R.estado = estadoInicial();
    R.util.pintarIconos();
    R.util.iniciarDialogos();
    R.util.iniciarAyudas();
    A.iniciar({ alIngresar: entrar, alSalir: salir });
    Object.values(VISTAS).forEach(v => v().iniciar());
    // Tema claro / oscuro / según el sistema
    const rotularTema = () => {
      const t = R.util.temaGuardado(), [texto, ico] = R.util.TEMAS[t];
      $("txt-tema").textContent = "Tema: " + texto.toLowerCase();
      const i = $("btn-tema").querySelector("svg"); const tpl = document.createElement("template"); tpl.innerHTML = R.util.ICONOS[ico];
      if (i) i.replaceWith(tpl.content.firstElementChild);
    };
    $("btn-tema").addEventListener("click", async () => { await R.util.menuTema($("btn-tema")); rotularTema(); });
    rotularTema();
    R.vistaFicha.iniciar();

    window.addEventListener("hashchange", () => { if (R.estado.perfil) ir(); });
    // Menú lateral: en computadora se recoge (y se recuerda); en celular se abre encima con un velo
    const esAncho = () => window.matchMedia("(min-width: 901px)").matches;
    const cerrarCelular = () => { $("lateral").classList.remove("abierto"); $("velo-menu").hidden = true; actualizarBoton(); };
    const rotularIconos = () => {
      const soloIconos = esAncho() && document.body.classList.contains("menu-cerrado");
      document.querySelectorAll("#lateral a[data-vista]").forEach(a => {
        if (soloIconos) { a.dataset.info = a.textContent.trim(); a.setAttribute("aria-label", a.textContent.trim()); }
        else { delete a.dataset.info; a.removeAttribute("aria-label"); }
      });
    };
    const actualizarBoton = () => {
      rotularIconos();
      const abierto = esAncho() ? !document.body.classList.contains("menu-cerrado") : $("lateral").classList.contains("abierto");
      $("btn-menu").setAttribute("aria-expanded", String(abierto));
      $("btn-menu").title = abierto ? "Ocultar el menú" : "Mostrar el menú";
    };
    $("btn-menu").addEventListener("click", () => {
      if (esAncho()) {
        const cerrado = document.body.classList.toggle("menu-cerrado");
        try { localStorage.setItem("panelit.menu", cerrado ? "cerrado" : "abierto"); } catch (e) {}
      } else {
        const abierto = $("lateral").classList.toggle("abierto");
        $("velo-menu").hidden = !abierto;
      }
      actualizarBoton();
    });
    $("velo-menu").addEventListener("click", cerrarCelular);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && $("lateral").classList.contains("abierto")) cerrarCelular(); });
    window.matchMedia("(min-width: 901px)").addEventListener("change", cerrarCelular);
    actualizarBoton();

    // Si la sesión vence o se cierra en otra pestaña, volver al login
    R.api.auth.alCambiar(evento => {
      if (evento === "SIGNED_OUT" && R.estado.perfil) { salir(); A.errorLogin("La sesión se cerró. Volvé a ingresar."); }
    });

    const perfil = await R.api.auth.yo();
    if (perfil) await entrar(perfil);
    else A.mostrar("pantalla-login");
  }

  // Modo de prueba sin servidor: solo en la PC (abrir con ?demo, ?demo=tecnico o ?demo=consulta)
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  function cargarScript(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = src + "?v=" + Date.now();
      s.onload = ok; s.onerror = () => mal(new Error("No se encontró " + src));
      document.head.appendChild(s);
    });
  }

  (document.fonts ? document.fonts.ready : Promise.resolve())
    .then(() => (local && /[?&]demo\b/.test(location.search) ? cargarScript("pruebas/datos-demo.js").then(() => cargarScript("pruebas/api-falsa.js")) : null))
    .then(arrancar)
    .catch(e => { A.mostrar("pantalla-login"); A.errorLogin(e.message); });
})(window.PANELIT);

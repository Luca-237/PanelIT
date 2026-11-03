// =====================================================================
//  Vista: Pendientes. Lista corta y compartida de lo que falta hacer en
//  tecnología. Se ordena por lo que conviene hacer primero: lo que está en
//  curso, después lo urgente. Todos pueden verla; admin y técnico tildan,
//  agregan y editan.
// =====================================================================
(function (R) {
  const { $, esc, norm, toast, confirmar, fmtFecha, ICONOS } = R.util;
  const PRIO = { alta: ["Alta", 0], media: ["Media", 1], baja: ["Baja", 2] };
  const ESTADOS = { pendiente: "Pendiente", en_curso: "En curso", hecho: "Hecho" };
  let editando = null;   // pendiente abierto en el diálogo (null = nuevo)

  const puede = () => R.app.puedeEditar();
  const porPrioridad = (a, b) => (PRIO[a.prioridad][1] - PRIO[b.prioridad][1]) || String(a.creado).localeCompare(String(b.creado));
  const abiertos = () => R.estado.pendientes.filter(p => p.estado !== "hecho");

  // Los que quedan por hacer, en el orden en que conviene encararlos
  function ordenados() {
    const ps = abiertos();
    return [...ps.filter(p => p.estado === "en_curso").sort(porPrioridad), ...ps.filter(p => p.estado === "pendiente").sort(porPrioridad)];
  }

  function chips(p) {
    const eq = p.equipoId && R.app.equipo(p.equipoId);
    const pag = p.paginaId && R.estado.paginas.find(x => x.id === p.paginaId);
    return `<span class="chip p-${esc(p.prioridad)}">${esc(PRIO[p.prioridad][0])}</span>` +
      (p.responsable ? `<span class="chip resp">${esc(p.responsable)}</span>` : `<span class="chip sin-resp">Sin responsable</span>`) +
      (eq ? `<span class="chip equipo">${esc(eq.descripcion)}</span>` : "") +
      (pag ? `<a class="chip pagina" href="#pagina/${esc(pag.id)}" data-ver-pagina>${ICONOS.doc}${esc(pag.titulo || "Sin título")}</a>` : "");
  }

  function fila(p) {
    const hecho = p.estado === "hecho";
    const primera = (p.detalle || "").split("\n")[0];
    return `<li class="pend${hecho ? " hecho" : ""}" data-id="${esc(p.id)}">
      <input type="checkbox" ${hecho ? "checked" : ""} ${puede() ? "" : "disabled"} aria-label="${hecho ? "Volver a pendiente" : "Marcar como hecho"}" data-tilde>
      <div class="pend-txt"><strong>${esc(p.titulo)}</strong>${primera ? `<small>${esc(primera)}</small>` : ""}
        <div class="chips">${chips(p)}</div></div>
      ${puede() && p.estado === "pendiente" ? `<button type="button" class="btn-texto" data-empezar title="Pasar a En curso">Empezar</button>` : ""}
      ${hecho ? `<small class="cuando">${fmtFecha(p.hechoEn)}</small>` : ""}
    </li>`;
  }

  function actualizarInsignia() {
    const n = abiertos().length;
    const b = $("nav-pend-n"); if (!b) return;
    b.textContent = String(n); b.hidden = n === 0;
  }

  function pintar() {
    const filtro = $("pe-resp").value, q = norm($("pe-buscar").value);
    const pasa = p => (!filtro || (filtro === "__nadie" ? !p.responsable : p.responsable === filtro)) &&
      (!q || norm(p.titulo + " " + p.detalle + " " + p.responsable).includes(q));
    const todos = R.estado.pendientes.filter(pasa);
    const curso = todos.filter(p => p.estado === "en_curso").sort(porPrioridad);
    const pend = todos.filter(p => p.estado === "pendiente").sort(porPrioridad);
    const hechos = todos.filter(p => p.estado === "hecho").sort((a, b) => String(b.hechoEn).localeCompare(String(a.hechoEn)));
    const bloque = (titulo, lista, vacio) => `<h2>${titulo} <span class="cuenta">${lista.length}</span></h2>
      <ul class="pend-lista">${lista.length ? lista.map(fila).join("") : `<li class="vacio">${vacio}</li>`}</ul>`;
    $("pend-listas").innerHTML =
      bloque("En curso", curso, "Nada en curso ahora.") + bloque("Para seguir", pend, "No quedan pendientes.") +
      `<details class="pend-hechos"><summary>Hechos <span class="cuenta">${hechos.length}</span></summary><ul class="pend-lista">${hechos.slice(0, 30).map(fila).join("") || `<li class="vacio">Todavía no hay.</li>`}</ul>${hechos.length > 30 ? `<p class="hint">Se muestran los 30 últimos.</p>` : ""}</details>`;
    const ab = abiertos();
    $("pend-resumen").textContent = `${ab.length} por hacer · ${ab.filter(p => p.prioridad === "alta").length} de prioridad alta · ${curso.length} en curso`;
  }

  function pintarFiltro() {
    const actual = $("pe-resp").value;
    const nombres = [...new Set(R.estado.pendientes.map(p => p.responsable).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    $("pe-resp").innerHTML = `<option value="">Todos</option><option value="__nadie">Sin responsable</option>` + nombres.map(n => `<option>${esc(n)}</option>`).join("");
    $("pe-resp").value = [...$("pe-resp").options].some(o => o.value === actual) ? actual : "";
    $("lista-responsables").innerHTML = nombres.map(n => `<option value="${esc(n)}">`).join("");
  }

  async function mostrar() {
    try { await R.app.recargarPendientes(); } catch (e) { toast(e.message, "error", 5000); }
    pintarFiltro(); pintar();
  }

  async function guardarCambio(p, cambios, mensaje) {
    try {
      await R.api.pendientes.editar(p.id, { ...p, ...cambios });
      await R.app.recargarPendientes();
      pintarFiltro(); pintar();
      if (mensaje) toast(mensaje);
    } catch (e) { toast(e.message, "error", 5000); await R.app.recargarPendientes().catch(() => {}); pintar(); }
  }

  // ---------- Diálogo ----------
  function abrir(p) {
    editando = p || null;
    const e = p || { titulo: "", detalle: "", estado: "pendiente", prioridad: "media", responsable: "", equipoId: null, paginaId: null };
    const solo = !puede();
    $("pendiente-titulo").textContent = p ? (solo ? "Pendiente" : "Editar pendiente") : "Nuevo pendiente";
    $("pe-titulo").value = e.titulo; $("pe-detalle").value = e.detalle || "";
    $("pe-estado").value = e.estado; $("pe-prioridad").value = e.prioridad; $("pe-responsable").value = e.responsable || "";
    $("pe-equipo").innerHTML = `<option value="">Sin equipo</option>` + [...R.estado.equipos].sort((a, b) => a.descripcion.localeCompare(b.descripcion))
      .map(x => `<option value="${esc(x.id)}" ${x.id === e.equipoId ? "selected" : ""}>${esc(x.descripcion)}</option>`).join("");
    const pags = [...R.estado.paginas].sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
    $("pe-pagina").innerHTML = `<option value="">Sin página</option>` + pags.map(x => `<option value="${esc(x.id)}" ${x.id === e.paginaId ? "selected" : ""}>${esc(x.titulo || "Sin título")}</option>`).join("");
    document.querySelectorAll("#form-pendiente input, #form-pendiente select, #form-pendiente textarea").forEach(c => { c.disabled = solo; });
    $("pendiente-guardar").hidden = solo; $("pendiente-borrar").hidden = solo || !p;
    $("pendiente-error").textContent = "";
    $("dlg-pendiente").showModal();
    if (!p) $("pe-titulo").focus();
  }

  async function guardar(ev) {
    ev.preventDefault();
    const datos = {
      titulo: $("pe-titulo").value.trim(), detalle: $("pe-detalle").value.trim(), estado: $("pe-estado").value, prioridad: $("pe-prioridad").value,
      responsable: $("pe-responsable").value.trim(), equipoId: $("pe-equipo").value || null, paginaId: $("pe-pagina").value || null,
    };
    if (!datos.titulo) { $("pendiente-error").textContent = "Falta el título."; return; }
    try {
      if (editando) await R.api.pendientes.editar(editando.id, datos); else await R.api.pendientes.crear(datos);
      $("dlg-pendiente").close();
      await R.app.recargarPendientes(); pintarFiltro(); pintar();
      toast("Guardado");
    } catch (e) { $("pendiente-error").textContent = e.message; }
  }

  async function borrar() {
    if (!await confirmar(`¿Borrar el pendiente “${editando.titulo}”? No se puede deshacer.`, { titulo: "Borrar pendiente", aceptar: "Borrar", peligro: true })) return;
    try {
      await R.api.pendientes.borrar(editando.id);
      $("dlg-pendiente").close();
      await R.app.recargarPendientes(); pintarFiltro(); pintar();
      toast("Borrado");
    } catch (e) { toast(e.message, "error", 5000); }
  }

  async function agregarRapido(ev) {
    ev.preventDefault();
    const inp = $("pe-rapido"), titulo = inp.value.trim();
    if (!titulo) return;
    inp.disabled = true;
    try {
      await R.api.pendientes.crear({ titulo, estado: "pendiente", prioridad: $("pe-rapido-prio").value, responsable: "" });
      inp.value = "";
      await R.app.recargarPendientes(); pintarFiltro(); pintar();
    } catch (e) { toast(e.message, "error", 5000); }
    finally { inp.disabled = false; inp.focus(); }
  }

  function iniciar() {
    $("pend-listas").addEventListener("click", e => {
      if (e.target.closest("[data-ver-pagina]")) return;                  // el enlace a la página navega solo
      const li = e.target.closest(".pend"); if (!li) return;
      const p = R.estado.pendientes.find(x => x.id === li.dataset.id); if (!p) return;
      if (e.target.closest("[data-tilde]")) {
        const hecho = e.target.checked;
        return guardarCambio(p, { estado: hecho ? "hecho" : "pendiente" }, hecho ? "Marcado como hecho" : "Vuelve a pendientes");
      }
      if (e.target.closest("[data-empezar]")) return guardarCambio(p, { estado: "en_curso" }, "Pasó a En curso");
      abrir(p);
    });
    $("pe-nuevo").addEventListener("click", () => abrir(null));
    $("form-rapido").addEventListener("submit", agregarRapido);
    $("form-pendiente").addEventListener("submit", guardar);
    $("pendiente-borrar").addEventListener("click", borrar);
    $("pe-resp").addEventListener("change", pintar);
    $("pe-buscar").addEventListener("input", pintar);
  }

  R.vistaPendientes = { iniciar, mostrar, ordenados, abiertos, actualizarInsignia, PRIO };
})(window.PANELIT);

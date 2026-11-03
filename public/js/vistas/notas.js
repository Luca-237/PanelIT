// =====================================================================
//  Vista: Notas. Tarjetas con búsqueda y filtros por etiqueta y equipo;
//  un diálogo para leerlas y, si se puede, editarlas. Las fijadas van
//  primero.
// =====================================================================
(function (R) {
  const { $, esc, norm, toast, confirmar, fmtFecha, fmtFechaHora, textoRico, ICONOS, esqueleto } = R.util;
  let notas = [];
  let actual = null;   // nota abierta en el diálogo (null = nueva)

  function tarjeta(n) {
    const eq = n.equipoId && R.app.equipo(n.equipoId);
    return `<button type="button" class="nota" data-nota="${esc(n.id)}">
      ${n.fijada ? `<span class="pin" title="Fijada">${ICONOS.pin}</span>` : ""}
      <h3>${esc(n.titulo)}</h3>
      ${(n.etiquetas || []).length || eq ? `<div class="chips">${eq ? `<span class="chip">${esc(eq.descripcion)}</span>` : ""}${(n.etiquetas || []).map(t => `<span class="chip etq">${esc(t)}</span>`).join("")}</div>` : ""}
      ${n.texto ? `<div class="cuerpo texto-rico">${textoRico(n.texto)}</div>` : ""}
      <div class="pie"><span>${esc(n.autor)}</span><span>${fmtFecha(n.actualizado)}</span></div>
    </button>`;
  }

  function filtradas() {
    const q = norm($("nt-buscar").value), et = $("nt-etiqueta").value, eq = $("nt-equipo").value;
    return notas.filter(n => (!et || (n.etiquetas || []).includes(et)) && (!eq || n.equipoId === eq) &&
      (!q || norm(n.titulo + " " + n.texto + " " + (n.etiquetas || []).join(" ")).includes(q)));
  }

  function pintarFiltros() {
    const et = $("nt-etiqueta"), eq = $("nt-equipo");
    const ve = et.value, vq = eq.value;
    const etiquetas = [...new Set(notas.flatMap(n => n.etiquetas || []))].sort((a, b) => a.localeCompare(b));
    et.innerHTML = `<option value="">Todas</option>` + etiquetas.map(t => `<option>${esc(t)}</option>`).join("");
    const conNotas = [...new Set(notas.map(n => n.equipoId).filter(Boolean))].map(R.app.equipo).filter(Boolean)
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    eq.innerHTML = `<option value="">Todos</option>` + conNotas.map(e => `<option value="${esc(e.id)}">${esc(e.descripcion)}</option>`).join("");
    et.value = ve; eq.value = vq;
  }

  function pintar() {
    const lista = filtradas();
    $("notas-lista").innerHTML = lista.length ? lista.map(tarjeta).join("")
      : `<p class="vacio">${notas.length ? "Ninguna nota coincide con la búsqueda." : "Todavía no hay notas."}</p>`;
  }

  async function mostrar() {
    $("notas-lista").innerHTML = esqueleto.notas(6);
    try { notas = await R.api.notas.listar(); }
    catch (e) { $("notas-lista").innerHTML = `<p class="vacio">${esc(e.message)}</p>`; return; }
    pintarFiltros(); pintar();
  }

  // ---------- Diálogo ----------
  // Abre una nota (id) o una nueva (id = null, con datos iniciales)
  async function abrir(id, inicial = {}) {
    if (id) {
      actual = notas.find(n => n.id === id);
      if (!actual) {
        try { actual = (await R.api.notas.listar()).find(n => n.id === id); } catch (e) { actual = null; }
      }
      if (!actual) return toast("Esa nota ya no existe", "error");
    } else actual = null;
    const puede = R.app.puedeEditar() && (!actual || actual.propia || R.app.esAdmin());
    const dlg = $("dlg-nota");
    // Si se abre desde la ficha de un equipo, que quede encima
    ($("dlg-ficha").open ? $("dlg-ficha") : document.body).appendChild(dlg);
    if (puede) pintarEdicion(actual || { titulo: "", texto: "", etiquetas: [], equipoId: inicial.equipoId || null, fijada: false });
    else pintarLectura(actual);
    dlg.showModal();
  }

  function pintarLectura(n) {
    const eq = n.equipoId && R.app.equipo(n.equipoId);
    $("nota-titulo").textContent = n.titulo;
    $("nota-cuerpo").innerHTML = `
      ${(n.etiquetas || []).length || eq ? `<div class="chips" style="margin:6px 0 12px">${eq ? `<span class="chip">${esc(eq.descripcion)}</span>` : ""}${(n.etiquetas || []).map(t => `<span class="chip etq">${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="texto-rico">${textoRico(n.texto) || `<p class="vacio">Sin texto.</p>`}</div>
      <p class="hint">${esc(n.autor)} · ${fmtFechaHora(n.actualizado)}</p>
      <div class="dlg-pie"><button class="btn-sec" type="button" data-cerrar>Cerrar</button></div>`;
  }

  function pintarEdicion(n) {
    const equipos = [...R.estado.equipos].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    $("nota-titulo").textContent = n.id ? "Editar nota" : "Nueva nota";
    $("nota-cuerpo").innerHTML = `
      <label for="n-titulo">Título</label><input id="n-titulo" maxlength="150" value="${esc(n.titulo)}" required>
      <div class="row">
        <div><label for="n-equipo">Equipo (opcional)</label><select id="n-equipo"><option value="">— Ninguno —</option>${equipos.map(e => `<option value="${esc(e.id)}" ${e.id === n.equipoId ? "selected" : ""}>${esc(e.descripcion)}</option>`).join("")}</select></div>
        <div><label for="n-etiquetas">Etiquetas</label><input id="n-etiquetas" maxlength="300" value="${esc((n.etiquetas || []).join(", "))}" placeholder="pendiente, impresoras…"></div>
      </div>
      <label for="n-texto">Texto</label><textarea id="n-texto" maxlength="20000" style="min-height:180px">${esc(n.texto)}</textarea>
      <div class="hint">Líneas que empiezan con "- " son viñetas; **negrita** y \`código\`. Las contraseñas no van acá: van en Equipos → Accesos.</div>
      <label class="check"><input type="checkbox" id="n-fijada" ${n.fijada ? "checked" : ""}> Fijar arriba</label>
      <div class="mensaje-error" id="nota-error" role="alert"></div>
      <div class="dlg-pie">${n.id ? `<button class="link peligro" type="button" id="n-borrar" style="margin-right:auto">Borrar</button>` : ""}
        <button class="btn-sec" type="button" data-cerrar>Cancelar</button><button class="btn-sec primario" type="submit">Guardar</button></div>`;
    $("n-titulo").focus();
    if (n.id) $("n-borrar").addEventListener("click", borrar);
  }

  async function guardar(ev) {
    ev.preventDefault();
    if (!$("n-titulo")) return;
    const datos = {
      titulo: $("n-titulo").value.trim(), texto: $("n-texto").value.trim(), equipoId: $("n-equipo").value || null,
      etiquetas: $("n-etiquetas").value.split(",").map(s => s.trim()).filter(Boolean), fijada: $("n-fijada").checked,
    };
    if (!datos.titulo) { $("nota-error").textContent = "Falta el título."; return; }
    try {
      if (actual) await R.api.notas.editar(actual.id, datos);
      else await R.api.notas.crear(datos);
      $("dlg-nota").close();
      toast("Nota guardada");
      await despuesDeCambiar();
    } catch (e) { $("nota-error").textContent = e.message; }
  }

  async function borrar() {
    if (!await confirmar(`¿Borrar la nota "${actual.titulo}"? No se puede deshacer.`, { titulo: "Borrar nota", aceptar: "Borrar", peligro: true })) return;
    try {
      await R.api.notas.borrar(actual.id);
      $("dlg-nota").close();
      toast("Nota borrada");
      await despuesDeCambiar();
    } catch (e) { toast(e.message, "error", 5000); }
  }

  async function despuesDeCambiar() {
    if (!$("vista-notas").hidden) await mostrar();
    else { try { notas = await R.api.notas.listar(); } catch (e) { /* se recarga al entrar */ } R.app.refrescar(); }
    R.vistaFicha.refrescar();
  }

  function iniciar() {
    ["nt-buscar", "nt-etiqueta", "nt-equipo"].forEach(id => $(id).addEventListener("input", pintar));
    $("notas-lista").addEventListener("click", e => { const t = e.target.closest("[data-nota]"); if (t) abrir(t.dataset.nota); });
    $("notas-nueva").addEventListener("click", () => abrir(null));
    $("form-nota").addEventListener("submit", guardar);
  }

  R.vistaNotas = { iniciar, mostrar, abrir, tarjeta };
})(window.PANELIT);

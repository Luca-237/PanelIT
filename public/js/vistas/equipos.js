// =====================================================================
//  Vista: Equipos. Tabla con filtros (búsqueda, sucursal, tipo, estado,
//  facturación), CSV, y el formulario para cargar o editar un equipo.
// =====================================================================
(function (R) {
  const { $, esc, norm, fmtId, toast, descargarCSV, ICONOS } = R.util;
  let editando = null;   // equipo que se está editando (null = nuevo)

  function filtrados() {
    const q = norm($("eq-buscar").value);
    const suc = $("eq-sucursal").value, tipo = $("eq-tipo").value, est = $("eq-estado").value, fact = $("eq-fact").checked;
    return R.estado.equipos.filter(e =>
      (!suc || e.sucursal === suc) && (!tipo || e.tipo === tipo) && (!fact || e.facturacion) &&
      (est === "" || (est === "vigentes" ? e.estado !== "baja" : e.estado === est)) &&
      (!q || norm([e.descripcion, e.nombreEquipo, e.usuarioHabitual, e.usuarioServidor, e.sucursal, e.teamviewerId, e.anydeskId, e.ip, (e.etiquetas || []).join(" ")].join(" ")).includes(q) ||
        norm(e.teamviewerId + " " + e.anydeskId).includes(q.replace(/\s/g, ""))));
  }

  const idRemoto = (app, id) => id ? `<span class="id-remoto"><span class="app-rem">${app}</span><span class="mono">${esc(fmtId(id))}</span><button type="button" class="btn-ico" data-copiar="${esc(id)}" title="Copiar ID">${ICONOS.copiar}</button></span>` : "";

  function pintarTabla() {
    const lista = filtrados();
    const vig = R.app.vigentes().length;
    $("equipos-resumen").textContent = `${vig} equipos en uso · mostrando ${lista.length}`;
    $("tabla-equipos").innerHTML = `<thead><tr><th>Equipo</th><th>Sucursal</th><th>Usuario habitual</th><th>Usuario del servidor</th><th>Acceso remoto</th><th class="num">Pto. venta Manager</th><th>Estado</th></tr></thead>
      <tbody>${lista.length ? lista.map(e => `<tr class="clic" data-id="${esc(e.id)}">
        <td><strong>${esc(e.descripcion)}</strong><small>${esc(e.tipo)}${e.nombreEquipo ? " · " + `<span class="mono">${esc(e.nombreEquipo)}</span>` : ""}</small></td>
        <td>${esc(e.sucursal || "—")}</td>
        <td>${esc(e.usuarioHabitual || "—")}</td>
        <td>${e.usuarioServidor ? `<span class="mono">${esc(e.usuarioServidor)}</span>` : `<span class="cero">—</span>`}</td>
        <td><div class="ids">${idRemoto("AD", e.anydeskId)}${idRemoto("TV", e.teamviewerId)}${!e.anydeskId && !e.teamviewerId ? "—" : ""}</div></td>
        <td class="num">${e.facturacion ? `<span class="chip fact">${esc(e.puntoVentaManager || "?")}</span>` : `<span class="cero">—</span>`}</td>
        <td>${R.app.chipEstado(e.estado)}</td></tr>`).join("")
        : `<tr><td colspan="7" class="vacio">No hay equipos con esos filtros.</td></tr>`}</tbody>`;
  }

  function pintarFiltros() {
    const suc = $("eq-sucursal"), tipo = $("eq-tipo");
    const s = suc.value, t = tipo.value;
    suc.innerHTML = `<option value="">Todas</option>` + R.app.sucursales().map(x => `<option>${esc(x)}</option>`).join("");
    tipo.innerHTML = `<option value="">Todos</option>` + R.app.TIPOS.map(x => `<option>${esc(x)}</option>`).join("");
    suc.value = s; tipo.value = t;
  }

  function mostrar() { pintarFiltros(); pintarTabla(); }

  // ---------- Formulario ----------
  const CAMPOS = ["descripcion", "tipo", "sucursal", "nombreEquipo", "usuarioHabitual", "usuarioServidor", "estado", "teamviewerId", "anydeskId", "puntoVentaManager", "puntoVentaMagnus", "ip", "observaciones"];

  function abrirFormulario(equipo = null) {
    editando = equipo;
    $("equipo-titulo").textContent = equipo ? "Editar equipo" : "Nuevo equipo";
    $("f-tipo").innerHTML = R.app.TIPOS.map(t => `<option>${esc(t)}</option>`).join("");
    const e = equipo || { tipo: "PC", estado: "activo" };
    CAMPOS.forEach(c => { $("f-" + c).value = e[c] || ""; });
    $("f-tipo").value = e.tipo || "PC";
    $("f-estado").value = e.estado || "activo";
    $("f-facturacion").checked = !!e.facturacion;
    $("f-etiquetas").value = (e.etiquetas || []).join(", ");
    $("equipo-error").textContent = "";
    ayudaUsuarioServidor();
    $("dlg-equipo").showModal();
    $("f-descripcion").focus();
  }

  // Avisa si el usuario del servidor elegido ya lo usa otro equipo
  function ayudaUsuarioServidor() {
    const v = norm($("f-usuarioServidor").value);
    const el = $("f-us-ayuda");
    if (!v) { el.textContent = ""; return; }
    const u = R.app.usoServidor().get(v);
    const otros = u ? u.equipos.filter(e => !editando || e.id !== editando.id) : [];
    el.textContent = !u || !u.enLista ? "No está en la lista de usuarios del servidor."
      : otros.length ? `Ya lo usa: ${otros.map(e => e.descripcion).join(", ")}.` : "Libre.";
  }

  async function guardar(ev) {
    ev.preventDefault();
    const datos = {};
    CAMPOS.forEach(c => { datos[c] = $("f-" + c).value.trim(); });
    datos.facturacion = $("f-facturacion").checked;
    datos.etiquetas = $("f-etiquetas").value.split(",").map(s => s.trim()).filter(Boolean);
    if (!datos.descripcion) { $("equipo-error").textContent = "Falta la descripción."; return; }
    const btn = ev.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const r = editando ? await R.api.equipos.editar(editando.id, datos) : await R.api.equipos.crear(datos);
      await R.app.recargarEquipos();
      $("dlg-equipo").close();
      toast(editando ? "Equipo guardado" : "Equipo cargado");
      R.app.refrescar();
      if ($("dlg-ficha").open || !editando) R.vistaFicha.abrir(r.id);
    } catch (err) { $("equipo-error").textContent = err.message; }
    finally { btn.disabled = false; }
  }

  function exportar() {
    const lista = filtrados();
    descargarCSV(`equipos-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Descripción", "Tipo", "Sucursal", "Nombre equipo", "Usuario habitual", "Factura", "ID TeamViewer", "ID AnyDesk", "Pto. venta Magnus", "Pto. venta Manager", "Usuario servidor", "IP", "Etiquetas", "Estado", "Observaciones"],
      ...lista.map(e => [e.descripcion, e.tipo, e.sucursal, e.nombreEquipo, e.usuarioHabitual, e.facturacion ? "Sí" : "No", e.teamviewerId, e.anydeskId, e.puntoVentaMagnus, e.puntoVentaManager, e.usuarioServidor, e.ip, (e.etiquetas || []).join(", "), R.app.ESTADOS[e.estado], e.observaciones]),
    ]);
  }

  function iniciar() {
    ["eq-buscar", "eq-sucursal", "eq-tipo", "eq-estado", "eq-fact"].forEach(id => $(id).addEventListener("input", pintarTabla));
    $("tabla-equipos").addEventListener("click", e => {
      const c = e.target.closest("[data-copiar]");
      if (c) { e.stopPropagation(); return R.util.copiar(c.dataset.copiar, c); }
      const fila = e.target.closest("tr[data-id]");
      if (fila) R.vistaFicha.abrir(fila.dataset.id);
    });
    $("equipos-nuevo").addEventListener("click", () => abrirFormulario());
    $("equipos-csv").addEventListener("click", exportar);
    $("form-equipo").addEventListener("submit", guardar);
    $("f-usuarioServidor").addEventListener("input", ayudaUsuarioServidor);
  }

  R.vistaEquipos = { iniciar, mostrar, abrirFormulario };
})(window.PANELIT);

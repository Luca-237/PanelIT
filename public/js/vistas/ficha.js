// =====================================================================
//  Ficha de un equipo (diálogo): pestañas Datos, Accesos (IDs remotos y,
//  solo para admin, contraseñas cifradas) y Notas del equipo.
//  Una contraseña mostrada se vuelve a ocultar sola a los 30 segundos.
// =====================================================================
(function (R) {
  const { $, esc, fmtId, fmtFecha, fmtFechaHora, toast, confirmar, ICONOS, textoRico } = R.util;
  const NOMBRES = { teamviewer: "TeamViewer", anydesk: "AnyDesk", windows: "Windows", servidor: "Usuario del servidor", otra: "Otra" };
  let equipoId = null, pestana = "datos", credEditando = null;
  const timers = new Map();

  const eq = () => R.app.equipo(equipoId);

  function abrir(id, pest = "datos") {
    if (!R.app.equipo(id)) return toast("Ese equipo ya no existe", "error");
    equipoId = id;
    timers.forEach(clearTimeout); timers.clear();
    elegir(pest);
    if (!$("dlg-ficha").open) $("dlg-ficha").showModal();
  }

  function elegir(p) {
    pestana = p;
    document.querySelectorAll("#dlg-ficha [data-pestana]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.pestana === p)));
    pintar();
  }

  function pintar() {
    const e = eq();
    if (!e) return $("dlg-ficha").close();
    $("ficha-titulo").innerHTML = `${esc(e.descripcion)} ${R.app.chipEstado(e.estado)}`;
    ({ datos: pintarDatos, accesos: pintarAccesos, paginas: pintarPaginas })[pestana](e);
  }

  const dato = (titulo, valor, mono) => `<div><dt>${esc(titulo)}</dt><dd>${valor ? (mono ? `<span class="mono">${esc(valor)}</span>` : esc(valor)) : "—"}</dd></div>`;

  function pintarDatos(e) {
    const uso = e.usuarioServidor && R.app.usoServidor().get(R.util.norm(e.usuarioServidor));
    const compartido = uso ? uso.equipos.filter(x => x.id !== e.id && R.app.USAN_SERVIDOR.includes(x.tipo) && R.app.USAN_SERVIDOR.includes(e.tipo)) : [];
    $("ficha-contenido").innerHTML = `<dl class="ficha-datos">
        ${dato("Tipo", e.tipo)}${dato("Sucursal", e.sucursal)}${dato("Nombre en Windows", e.nombreEquipo, true)}
        ${dato("Usuario habitual", e.usuarioHabitual)}${dato("Usuario del servidor", e.usuarioServidor, true)}${dato("IP", e.ip, true)}
        ${dato("Factura", e.facturacion ? "Sí" : "No")}${dato("Pto. venta Manager", e.puntoVentaManager)}${dato("Pto. venta Magnus", e.puntoVentaMagnus)}
      </dl>
      ${compartido.length ? `<div class="aviso-seguro">${ICONOS.alerta}<span>El usuario del servidor <strong>${esc(e.usuarioServidor)}</strong> también lo usa: ${compartido.map(x => esc(x.descripcion)).join(", ")}.</span></div>` : ""}
      ${uso && !uso.enLista ? `<div class="aviso-seguro">${ICONOS.alerta}<span><strong>${esc(e.usuarioServidor)}</strong> no está en la lista de usuarios del servidor.</span></div>` : ""}
      ${(e.etiquetas || []).length ? `<div class="chips" style="margin:6px 0 10px">${e.etiquetas.map(t => `<span class="chip etq">${esc(t)}</span>`).join("")}</div>` : ""}
      ${e.observaciones ? `<h2 style="margin-top:14px">Observaciones</h2><div class="texto-rico">${textoRico(e.observaciones)}</div>` : ""}
      <p class="hint">Última modificación: ${fmtFechaHora(e.actualizado)}${e.actualizadoPor ? " · " + esc(e.actualizadoPor) : ""}</p>
      ${R.app.puedeEditar() ? `<div class="ficha-acciones">
        <button type="button" class="btn-sec primario" data-accion="editar">${ICONOS.lapiz}Editar</button>
        ${e.estado !== "baja" ? `<button type="button" class="btn-sec" data-accion="baja">Pasar a "De baja"</button>` : `<button type="button" class="btn-sec" data-accion="reactivar">Volver a activo</button>`}
        ${R.app.esAdmin() ? `<button type="button" class="link peligro" data-accion="borrar" style="margin-left:auto">Borrar del todo</button>` : ""}
      </div>` : ""}`;
  }

  const filaId = (nombre, id) => `<li><div><div class="pass-tipo">${nombre}</div>${id ? `<span class="mono pass-valor">${esc(fmtId(id))}</span>` : `<small class="hint">Sin cargar</small>`}</div>
    ${id ? `<div class="pass-acciones"><button type="button" class="btn-ico" data-copiar="${esc(id)}" title="Copiar ID">${ICONOS.copiar}</button></div>` : ""}</li>`;

  async function pintarAccesos(e) {
    const c = $("ficha-contenido");
    c.innerHTML = `<h2 style="margin-top:12px">IDs de acceso remoto</h2><ul class="pass-lista">${filaId("AnyDesk", e.anydeskId)}${filaId("TeamViewer", e.teamviewerId)}</ul>
      <h2 style="margin-top:18px">Contraseñas</h2><div id="ficha-pass"></div>`;
    const caja = $("ficha-pass");
    if (!R.app.esAdmin()) { caja.innerHTML = `<p class="vacio">Las contraseñas solo las ve un admin.${e.credenciales ? ` Este equipo tiene ${e.credenciales} guardada(s).` : ""}</p>`; return; }
    caja.innerHTML = `<p class="vacio">Cargando…</p>`;
    try {
      const lista = await R.api.credenciales.listar(e.id);
      if (equipoId !== e.id || pestana !== "accesos") return;
      caja.innerHTML = `<ul class="pass-lista">${lista.map(p => `<li data-cred="${esc(p.id)}">
          <div><div class="pass-tipo">${esc(NOMBRES[p.tipo] || p.tipo)}${p.usuario ? ` <small>Usuario: <span class="mono">${esc(p.usuario)}</span></small>` : ""}</div>
            <span class="mono pass-valor" data-valor>••••••••</span> <small class="hint">${fmtFecha(p.actualizado)}${p.actualizadoPor ? " · " + esc(p.actualizadoPor) : ""}</small></div>
          <div class="pass-acciones">
            <button type="button" class="btn-ico" data-cred-accion="ver" title="Mostrar (queda registrado)">${ICONOS.ver}</button>
            <button type="button" class="btn-ico" data-cred-accion="copiar" title="Copiar (queda registrado)">${ICONOS.copiar}</button>
            <button type="button" class="btn-ico" data-cred-accion="editar" title="Editar">${ICONOS.lapiz}</button>
            <button type="button" class="btn-ico" data-cred-accion="borrar" title="Borrar">${ICONOS.borrar}</button>
          </div></li>`).join("") || `<li class="vacio">No hay contraseñas guardadas para este equipo.</li>`}</ul>
        <div class="aviso-seguro">${ICONOS.llave}<span>Se guardan cifradas. Cada vez que alguien muestra o copia una, queda anotado en Actividad.</span></div>
        <div class="ficha-acciones"><button type="button" class="btn-sec primario" data-accion="nueva-pass">${ICONOS.mas}Agregar contraseña</button></div>`;
      caja._lista = lista;
    } catch (err) { caja.innerHTML = `<p class="vacio">${esc(err.message)}</p>`; }
  }

  function pintarPaginas(e) {
    const ps = R.vistaPaginas.delEquipo(e.id);
    $("ficha-contenido").innerHTML = `${R.app.puedeEditar() ? `<div class="ficha-acciones" style="margin-top:10px"><button type="button" class="btn-sec primario" data-accion="nueva-pagina">${ICONOS.mas}Nueva página de este equipo</button></div>` : ""}
      <div class="lista-paginas" style="margin-top:12px">${ps.map(x => `<a class="tarjeta-pagina" href="#pagina/${esc(x.id)}" data-cerrar-ficha>${ICONOS.doc}<span><strong>${esc(x.titulo || "Sin título")}</strong><small>${esc(x.actualizadoPor || "")} · ${fmtFecha(x.actualizado)}</small></span></a>`).join("") || `<p class="vacio">Este equipo todavía no tiene páginas.</p>`}</div>`;
  }

  // ---------- Acciones ----------
  async function cambiarEstado(estado) {
    const e = eq();
    try {
      await R.api.equipos.editar(e.id, { ...e, estado });
      await R.app.recargarEquipos();
      toast(estado === "baja" ? "Equipo pasado a De baja" : "Equipo activo de nuevo");
      pintar(); R.app.refrescar();
    } catch (err) { toast(err.message, "error", 5000); }
  }

  async function borrarEquipo() {
    const e = eq();
    if (!await confirmar(`Se borra "${e.descripcion}" con sus contraseñas guardadas. Sus notas quedan, sin equipo. Lo normal es pasarlo a "De baja". ¿Borrar igual?`, { titulo: "Borrar equipo", aceptar: "Borrar", peligro: true })) return;
    try {
      await R.api.equipos.borrar(e.id);
      $("dlg-ficha").close();
      await R.app.recargarEquipos();
      toast("Equipo borrado"); R.app.refrescar();
    } catch (err) { toast(err.message, "error", 5000); }
  }

  async function accionCredencial(accion, li) {
    const id = li.dataset.cred;
    const p = ($("ficha-pass")._lista || []).find(x => x.id === id);
    if (accion === "ver") {
      const el = li.querySelector("[data-valor]");
      const btn = li.querySelector('[data-cred-accion="ver"]');
      if (timers.has(id)) { ocultar(id, el, btn); return; }
      try {
        el.textContent = await R.api.credenciales.revelar(id);
        btn.innerHTML = ICONOS.ocultar; btn.title = "Ocultar";
        timers.set(id, setTimeout(() => ocultar(id, el, btn), 30000));
      } catch (err) { toast(err.message, "error", 5000); }
    } else if (accion === "copiar") {
      try { await R.util.copiar(await R.api.credenciales.revelar(id), li.querySelector('[data-cred-accion="copiar"]')); }
      catch (err) { toast(err.message, "error", 5000); }
    } else if (accion === "editar") {
      abrirCredencial(p);
    } else if (accion === "borrar") {
      if (!await confirmar(`¿Borrar la contraseña de ${NOMBRES[p.tipo]}${p.usuario ? ` (${p.usuario})` : ""}? No se puede deshacer.`, { titulo: "Borrar contraseña", aceptar: "Borrar", peligro: true })) return;
      try { await R.api.credenciales.borrar(id); await R.app.recargarEquipos(); toast("Contraseña borrada"); pintar(); }
      catch (err) { toast(err.message, "error", 5000); }
    }
  }
  function ocultar(id, el, btn) {
    clearTimeout(timers.get(id)); timers.delete(id);
    el.textContent = "••••••••";
    btn.innerHTML = ICONOS.ver; btn.title = "Mostrar (queda registrado)";
  }

  function abrirCredencial(p = null) {
    credEditando = p;
    $("credencial-titulo").textContent = p ? "Editar contraseña" : "Agregar contraseña";
    $("c-tipo").value = p ? p.tipo : "teamviewer";
    $("c-usuario").value = p ? p.usuario : "";
    $("c-valor").value = "";
    $("c-valor").type = "password"; $("c-ver").checked = false;
    $("c-ayuda").textContent = p ? "Dejala vacía para mantener la que está guardada." : "";
    $("credencial-error").textContent = "";
    $("dlg-ficha").appendChild($("dlg-credencial"));
    $("dlg-credencial").showModal();
  }

  async function guardarCredencial(ev) {
    ev.preventDefault();
    const datos = { tipo: $("c-tipo").value, usuario: $("c-usuario").value.trim(), valor: $("c-valor").value };
    if (!credEditando && !datos.valor) { $("credencial-error").textContent = "Falta la contraseña."; return; }
    try {
      if (credEditando) await R.api.credenciales.editar(credEditando.id, datos);
      else await R.api.credenciales.crear(equipoId, datos);
      $("c-valor").value = "";
      $("dlg-credencial").close();
      await R.app.recargarEquipos();
      toast("Contraseña guardada");
      pintar();
    } catch (err) { $("credencial-error").textContent = err.message; }
  }

  function iniciar() {
    document.querySelectorAll("#dlg-ficha [data-pestana]").forEach(b => b.addEventListener("click", () => elegir(b.dataset.pestana)));
    $("ficha-contenido").addEventListener("click", ev => {
      const cop = ev.target.closest("[data-copiar]");
      if (cop) return R.util.copiar(cop.dataset.copiar, cop);
      const ca = ev.target.closest("[data-cred-accion]");
      if (ca) return accionCredencial(ca.dataset.credAccion, ca.closest("[data-cred]"));
      if (ev.target.closest("[data-cerrar-ficha]")) { $("dlg-ficha").close(); return; }
      const b = ev.target.closest("[data-accion]");
      if (!b) return;
      const a = b.dataset.accion;
      if (a === "editar") R.vistaEquipos.abrirFormulario(eq());
      else if (a === "baja") cambiarEstado("baja");
      else if (a === "reactivar") cambiarEstado("activo");
      else if (a === "borrar") borrarEquipo();
      else if (a === "nueva-pass") abrirCredencial();
      else if (a === "nueva-pagina") { $("dlg-ficha").close(); R.vistaPaginas.crear(null, { equipoId }); }
    });
    $("form-credencial").addEventListener("submit", guardarCredencial);
    $("c-ver").addEventListener("change", e => { $("c-valor").type = e.target.checked ? "text" : "password"; });
    // Al cerrar la ficha no queda ninguna contraseña a la vista
    $("dlg-ficha").addEventListener("close", () => { timers.forEach(clearTimeout); timers.clear(); $("ficha-contenido").innerHTML = ""; });
    $("dlg-credencial").addEventListener("close", () => { $("c-valor").value = ""; });
  }

  R.vistaFicha = { iniciar, abrir, refrescar: () => { if ($("dlg-ficha").open) pintar(); } };
})(window.PANELIT);

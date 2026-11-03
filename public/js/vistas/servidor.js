// =====================================================================
//  Vista: Conexión al servidor. Esquema (sucursales → Escritorio remoto
//  → servidores, armado con los equipos cargados), la guía editable y
//  la lista de usuarios del servidor con quién usa cada uno.
// =====================================================================
(function (R) {
  const { $, esc, norm, toast, confirmar, fmtFechaHora, ICONOS } = R.util;

  // ---------- Esquema ----------
  function pintarEsquema() {
    const vig = R.app.vigentes();
    const servidores = vig.filter(e => e.tipo === "Servidor");
    const clientes = vig.filter(e => R.app.USAN_SERVIDOR.includes(e.tipo));
    const porSuc = new Map();
    clientes.forEach(e => {
      const s = e.sucursal || "Sin sucursal";
      if (!porSuc.has(s)) porSuc.set(s, { n: 0, cajas: 0 });
      porSuc.get(s).n++;
      if (e.facturacion) porSuc.get(s).cajas++;
    });
    $("esquema").innerHTML = `
      <div class="esq-col"><div class="esq-titulo">Equipos</div>
        ${[...porSuc.entries()].sort((a, b) => b[1].n - a[1].n).map(([s, d]) => `<div class="nodo"><strong>${esc(s)}</strong><small>${d.n} equipo(s)${d.cajas ? ` · ${d.cajas} caja(s)` : ""}</small></div>`).join("") || `<p class="vacio">Sin equipos cargados.</p>`}
      </div>
      <div class="enlace"><span class="flecha" aria-hidden="true"></span><span><strong>Escritorio remoto (RDP)</strong><br>cada equipo con su usuario del servidor</span></div>
      <div class="esq-col"><div class="esq-titulo">Servidores · Central</div>
        ${servidores.map(s => `<button type="button" class="nodo servidor" data-equipo="${esc(s.id)}" style="text-align:left; cursor:pointer; font:inherit">
          <strong>${esc(s.descripcion)}</strong><small><span class="mono">${esc(s.nombreEquipo || "—")}</span>${s.ip ? ` · <span class="mono">${esc(s.ip)}</span>` : ""}</small>
          ${s.observaciones ? `<small>${esc(s.observaciones.split("\n")[0])}</small>` : ""}</button>`).join("") || `<p class="vacio">Cargá los servidores como equipos de tipo "Servidor".</p>`}
      </div>`;
  }

  // ---------- Guía (es una página: se edita ahí) ----------
  function pintarGuia() {
    const g = R.estado.guiaId && R.estado.paginas.find(x => x.id === R.estado.guiaId);
    $("guia-caja").innerHTML = g
      ? `<h2>Guía</h2><a class="tarjeta-pagina" href="#pagina/${esc(g.id)}">${ICONOS.doc}<span><strong>${esc(g.titulo || "Sin título")}</strong><small>Cómo funciona la conexión, los servidores, la red y los problemas conocidos · editada ${fmtFechaHora(g.actualizado)}</small></span></a>`
      : "";
  }

  // ---------- Usuarios del servidor ----------
  function pintarUsuarios() {
    const q = norm($("us-buscar").value), f = $("us-filtro").value;
    const editable = R.app.puedeEditar();
    const lista = [...R.app.usoServidor().values()]
      .filter(u => {
        const comunes = u.equipos.filter(e => R.app.USAN_SERVIDOR.includes(e.tipo));
        if (f === "libre" && (u.equipos.length || !u.enLista)) return false;
        if (f === "compartido" && comunes.length < 2) return false;
        if (f === "fuera" && u.enLista) return false;
        return !q || norm(u.nombre + " " + u.equipos.map(e => e.descripcion + " " + e.usuarioHabitual).join(" ")).includes(q);
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    $("tabla-usuarios-servidor").innerHTML = `<thead><tr><th>Usuario</th><th>Lo usa</th><th>Estado</th><th>Notas</th>${editable ? "<th></th>" : ""}</tr></thead>
      <tbody>${lista.map(u => {
        const comunes = u.equipos.filter(e => R.app.USAN_SERVIDOR.includes(e.tipo));
        const estado = !u.enLista ? `<span class="chip estado-reparacion">No está en la lista</span>`
          : comunes.length > 1 ? `<span class="chip estado-reparacion">Compartido</span>`
          : u.equipos.length ? `<span class="chip estado-activo">En uso</span>` : `<span class="chip estado-baja">Libre</span>`;
        return `<tr><td><span class="mono">${esc(u.nombre)}</span></td>
          <td>${u.equipos.map(e => `<button type="button" class="link" data-equipo="${esc(e.id)}">${esc(e.descripcion)}</button>${e.usuarioHabitual ? ` <small style="display:inline">(${esc(e.usuarioHabitual)})</small>` : ""}`).join("<br>") || `<span class="cero">—</span>`}</td>
          <td>${estado}</td><td>${esc(u.notas || "")}</td>
          ${editable ? `<td><div class="acciones-fila">${u.enLista
            ? `<button type="button" class="link" data-editar="${esc(u.id)}">Editar</button><button type="button" class="link peligro" data-quitar-us="${esc(u.id)}">Quitar</button>`
            : `<button type="button" class="link" data-agregar-us="${esc(u.nombre)}">Agregar a la lista</button>`}</div></td>` : ""}</tr>`;
      }).join("") || `<tr><td colspan="5" class="vacio">Nada para mostrar.</td></tr>`}</tbody>`;
  }

  async function editarUsuario(u) {
    const r = await R.util.formulario({
      titulo: u && u.id ? "Editar usuario del servidor" : "Agregar usuario del servidor",
      campos: [
        { nombre: "nombre", etiqueta: "Usuario de Windows del servidor", valor: u ? u.nombre : "", requerido: true },
        { nombre: "notas", etiqueta: "Notas", valor: u ? u.notas || "" : "", ayuda: "Ej.: para qué se creó. Sin contraseñas." },
      ],
      aceptar: "Guardar",
    });
    if (!r) return;
    try {
      if (u && u.id) await R.api.usuariosServidor.editar(u.id, r);
      else await R.api.usuariosServidor.crear(r);
      await R.app.recargarUsuariosServidor();
      toast("Guardado"); pintarUsuarios();
    } catch (e) { toast(e.message, "error", 5000); }
  }

  async function quitarUsuario(id) {
    const u = R.estado.usuariosServidor.find(x => x.id === id);
    const usado = R.app.usoServidor().get(norm(u.nombre));
    const texto = usado && usado.equipos.length
      ? `"${u.nombre}" lo usan ${usado.equipos.length} equipo(s). Se saca solo de esta lista; en el servidor sigue existiendo. ¿Quitar?`
      : `Se saca "${u.nombre}" de esta lista (en el servidor sigue existiendo). ¿Quitar?`;
    if (!await confirmar(texto, { titulo: "Quitar usuario", aceptar: "Quitar", peligro: true })) return;
    try { await R.api.usuariosServidor.borrar(id); await R.app.recargarUsuariosServidor(); toast("Quitado"); pintarUsuarios(); }
    catch (e) { toast(e.message, "error", 5000); }
  }

  function mostrar() { pintarEsquema(); pintarUsuarios(); pintarGuia(); }

  function iniciar() {
    $("vista-servidor").addEventListener("click", e => {
      const eq = e.target.closest("[data-equipo]");
      if (eq) return R.vistaFicha.abrir(eq.dataset.equipo);
      const ed = e.target.closest("[data-editar]");
      if (ed) return editarUsuario(R.estado.usuariosServidor.find(u => u.id === ed.dataset.editar));
      const q = e.target.closest("[data-quitar-us]");
      if (q) return quitarUsuario(q.dataset.quitarUs);
      const ag = e.target.closest("[data-agregar-us]");
      if (ag) return editarUsuario({ nombre: ag.dataset.agregarUs });
    });
    $("us-buscar").addEventListener("input", pintarUsuarios);
    $("us-filtro").addEventListener("change", pintarUsuarios);
    $("us-nuevo").addEventListener("click", () => editarUsuario(null));
  }

  R.vistaServidor = { iniciar, mostrar };
})(window.PANELIT);

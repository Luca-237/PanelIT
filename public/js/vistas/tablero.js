// =====================================================================
//  Vista: Tablero. Números generales, lo que conviene revisar (usuarios
//  del servidor repetidos, puntos de venta repetidos, datos faltantes),
//  equipos por sucursal y notas fijadas o recientes.
// =====================================================================
(function (R) {
  const { $, esc, fmtFecha, ICONOS } = R.util;

  function kpi(etiqueta, valor, detalle, destacado) {
    return `<div class="kpi${destacado ? " destacado" : ""}"><div class="etiqueta">${esc(etiqueta)}</div><div class="valor">${valor}</div><div class="detalle">${detalle}</div></div>`;
  }

  function mostrar() {
    const app = R.app;
    const vig = app.vigentes();
    const activos = vig.filter(e => e.estado === "activo");
    const reparacion = vig.length - activos.length;
    const baja = R.estado.equipos.length - vig.length;
    const cajas = vig.filter(e => e.facturacion);
    const uso = [...app.usoServidor().values()].filter(u => u.enLista);
    const libres = uso.filter(u => !u.equipos.length).length;

    $("tablero-kpis").innerHTML =
      kpi("Equipos activos", activos.length, `${reparacion} en reparación · ${baja} de baja`, true) +
      kpi("Cajas que facturan", cajas.length, `${new Set(cajas.map(e => e.sucursal)).size} sucursales`) +
      kpi("Servidores", vig.filter(e => e.tipo === "Servidor").length, "Ver Conexión al servidor") +
      kpi("Usuarios del servidor libres", libres, `de ${uso.length} en la lista`);

    const avisos = app.paraRevisar();
    $("tablero-revisar").innerHTML = avisos.length ? avisos.map((a, i) => `<li>
        <div class="que">${ICONOS.alerta}<div><strong>${esc(a.texto)}</strong>${a.detalle ? `<br><small>${esc(a.detalle)}</small>` : ""}
          <div class="chips" style="margin-top:6px">${a.equipos.slice(0, 8).map(e => `<button type="button" class="link" data-equipo="${esc(e.id)}">${esc(e.descripcion)}</button>`).join(" · ")}${a.equipos.length > 8 ? ` <small>y ${a.equipos.length - 8} más</small>` : ""}</div></div></div></li>`).join("")
      : `<li class="vacio">Nada para revisar.</li>`;

    const porSuc = new Map();
    activos.forEach(e => porSuc.set(e.sucursal || "Sin sucursal", (porSuc.get(e.sucursal || "Sin sucursal") || 0) + 1));
    const max = Math.max(1, ...porSuc.values());
    $("tablero-sucursales").innerHTML = [...porSuc.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) =>
      `<li><span>${esc(s)}</span><span class="pista"><span class="relleno" style="width:${(n / max) * 100}%"></span></span><span class="n">${n}</span></li>`).join("")
      || `<li class="vacio">Sin equipos cargados.</li>`;

    const sig = R.vistaPendientes.ordenados().slice(0, 5);
    $("tablero-pendientes").innerHTML = sig.length ? sig.map(p => `<li class="clic" data-pendiente><span>${esc(p.titulo)}<br><small>${p.estado === "en_curso" ? "En curso" : "Pendiente"} · prioridad ${esc(R.vistaPendientes.PRIO[p.prioridad][0].toLowerCase())}${p.responsable ? " · " + esc(p.responsable) : ""}</small></span></li>`).join("")
      : `<li class="vacio">No hay pendientes. Todo al día.</li>`;
    const recientes = [...R.estado.paginas].sort((a, b) => String(b.actualizado).localeCompare(String(a.actualizado))).slice(0, 6);
    $("tablero-paginas").innerHTML = recientes.length ? recientes.map(n => {
      const eq = n.equipoId && app.equipo(n.equipoId);
      return `<li class="clic" data-pagina="${esc(n.id)}"><span>${esc(n.titulo || "Sin título")}<br><small>${eq ? esc(eq.descripcion) + " · " : ""}${esc(n.actualizadoPor || "")} · ${fmtFecha(n.actualizado)}</small></span></li>`;
    }).join("") : `<li class="vacio">Todavía no hay páginas.</li>`;
  }

  function iniciar() {
    $("tablero-revisar").addEventListener("click", e => {
      const b = e.target.closest("[data-equipo]");
      if (b) R.vistaFicha.abrir(b.dataset.equipo);
    });
    $("tablero-pendientes").addEventListener("click", e => { if (e.target.closest("[data-pendiente]")) location.hash = "#pendientes"; });
    $("tablero-paginas").addEventListener("click", e => {
      const l = e.target.closest("[data-pagina]");
      if (l) location.hash = "#pagina/" + l.dataset.pagina;
    });
  }

  R.vistaTablero = { iniciar, mostrar };
})(window.PANELIT);

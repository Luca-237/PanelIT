// =====================================================================
//  Vista: Actividad (solo admin). Últimos movimientos, con filtro para
//  ver solo lo relacionado con contraseñas.
// =====================================================================
(function (R) {
  const { $, esc, fmtFechaHora, esqueleto } = R.util;
  let lista = [];

  function pintar() {
    const soloPass = $("act-pass").checked;
    const filas = lista.filter(a => !soloPass || a.accion.startsWith("contraseña"));
    $("tabla-actividad").innerHTML = `<thead><tr><th>Fecha</th><th>Usuario</th><th>Qué hizo</th><th>Detalle</th></tr></thead>
      <tbody>${filas.map(a => `<tr><td style="white-space:nowrap">${fmtFechaHora(a.fecha)}</td><td><span class="mono">${esc(a.usuario)}</span></td>
        <td>${a.accion === "contraseña mostrada" ? `<strong>${esc(a.accion)}</strong>` : esc(a.accion)}</td><td>${esc(a.detalle)}</td></tr>`).join("")
        || `<tr><td colspan="4" class="vacio">Sin movimientos.</td></tr>`}</tbody>`;
  }

  async function mostrar() {
    $("tabla-actividad").innerHTML = esqueleto.tabla(4, 8);
    try { lista = await R.api.actividad.listar(); pintar(); }
    catch (e) { $("tabla-actividad").innerHTML = `<tbody><tr><td class="vacio">${esc(e.message)}</td></tr></tbody>`; }
  }

  function iniciar() { $("act-pass").addEventListener("change", pintar); }

  R.vistaActividad = { iniciar, mostrar };
})(window.PANELIT);

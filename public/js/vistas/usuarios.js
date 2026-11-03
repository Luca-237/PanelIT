// =====================================================================
//  Vista: Usuarios del panel (solo admin). Alta, rol, activar/desactivar
//  y contraseña nueva.
// =====================================================================
(function (R) {
  const { $, esc, toast, esqueleto } = R.util;
  const ROLES = { admin: "Admin", tecnico: "Técnico", consulta: "Consulta" };
  let usuarios = [], editando = null;

  async function mostrar() {
    $("tabla-usuarios").innerHTML = esqueleto.tabla(4, 3);
    try { usuarios = await R.api.usuarios.listar(); }
    catch (e) { $("tabla-usuarios").innerHTML = `<tbody><tr><td class="vacio">${esc(e.message)}</td></tr></tbody>`; return; }
    $("tabla-usuarios").innerHTML = `<thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th></tr></thead>
      <tbody>${usuarios.map(u => `<tr class="clic${u.activo ? "" : " inactivo"}" data-id="${esc(u.id)}">
        <td><span class="mono">${esc(u.usuario)}</span>${u.id === R.estado.perfil.id ? " <small style=\"display:inline\">(vos)</small>" : ""}</td>
        <td>${esc(u.nombre)}</td><td>${esc(ROLES[u.rol] || u.rol)}</td>
        <td>${u.activo ? `<span class="chip estado-activo">Activo</span>` : `<span class="chip estado-baja">Desactivado</span>`}</td></tr>`).join("")}</tbody>`;
  }

  function abrir(u = null) {
    editando = u;
    $("usuario-titulo").textContent = u ? `Editar ${u.usuario}` : "Nuevo usuario";
    $("u-usuario").value = u ? u.usuario : "";
    $("u-usuario").disabled = !!u;
    $("u-nombre").value = u ? u.nombre : "";
    $("u-rol").value = u ? u.rol : "consulta";
    $("u-password").value = "";
    $("u-password-label").textContent = u ? "Contraseña nueva (dejar vacía para no cambiarla)" : "Contraseña";
    $("u-activo").checked = u ? u.activo : true;
    $("u-activo-wrap").hidden = !u;
    $("usuario-error").textContent = "";
    $("dlg-usuario").showModal();
    (u ? $("u-nombre") : $("u-usuario")).focus();
  }

  async function guardar(ev) {
    ev.preventDefault();
    const datos = { nombre: $("u-nombre").value.trim(), rol: $("u-rol").value, password: $("u-password").value };
    if (!editando) datos.usuario = $("u-usuario").value.trim().toLowerCase();
    else datos.activo = $("u-activo").checked;
    if (!datos.password) delete datos.password;
    try {
      if (editando) await R.api.usuarios.editar(editando.id, datos);
      else await R.api.usuarios.crear(datos);
      $("u-password").value = "";
      $("dlg-usuario").close();
      toast("Usuario guardado");
      mostrar();
    } catch (e) { $("usuario-error").textContent = e.message; }
  }

  function iniciar() {
    $("usuarios-nuevo").addEventListener("click", () => abrir());
    $("tabla-usuarios").addEventListener("click", e => {
      const f = e.target.closest("tr[data-id]");
      if (f) abrir(usuarios.find(u => u.id === f.dataset.id));
    });
    $("form-usuario").addEventListener("submit", guardar);
  }

  R.vistaUsuarios = { iniciar, mostrar };
})(window.PANELIT);

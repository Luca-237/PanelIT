// =====================================================================
//  Vista: pantallas de acceso (cargando / login), barra del usuario
//  logueado y cambio de la contraseña propia.
// =====================================================================
(function (R) {
  const { $, toast } = R.util;
  const PANTALLAS = ["pantalla-carga", "pantalla-login", "app"];
  const ROLES = { admin: "Admin", tecnico: "Técnico", consulta: "Consulta" };

  function mostrar(id) {
    PANTALLAS.forEach(p => { $(p).hidden = p !== id; });
  }

  function mostrarUsuario(perfil) {
    $("usuario-nombre").textContent = perfil.nombre || perfil.usuario;
    $("usuario-rol").textContent = ROLES[perfil.rol] || perfil.rol;
    $("usuario-rol").classList.toggle("admin", perfil.rol === "admin");
    // Lo que solo ve un admin o quien puede editar (el servidor igual lo vuelve a verificar)
    document.querySelectorAll("[data-solo-admin]").forEach(el => { el.hidden = perfil.rol !== "admin"; });
    document.querySelectorAll("[data-puede-editar]").forEach(el => { el.hidden = !["admin", "tecnico"].includes(perfil.rol); });
  }

  function errorLogin(mensaje) { $("login-error").textContent = mensaje || ""; }

  function iniciar({ alIngresar, alSalir }) {
    $("form-login").addEventListener("submit", async e => {
      e.preventDefault();
      errorLogin("");
      $("login-btn").disabled = true;
      try {
        const perfil = await R.api.auth.ingresar($("login-usuario").value.trim(), $("login-password").value);
        $("login-password").value = "";
        await alIngresar(perfil);
      } catch (err) {
        errorLogin(err.message);
      } finally { $("login-btn").disabled = false; }
    });
    $("salir").addEventListener("click", async () => {
      await R.api.auth.salir();
      alSalir();
    });
    $("cambiar-password").addEventListener("click", async () => {
      const r = await R.util.formulario({
        titulo: "Cambiar mi contraseña",
        campos: [
          { nombre: "actual", etiqueta: "Contraseña actual", tipo: "password", requerido: true },
          { nombre: "nueva", etiqueta: "Contraseña nueva", tipo: "password", requerido: true, min: 10, ayuda: "Mínimo 10 caracteres. Se cierran tus otras sesiones abiertas." },
        ],
        aceptar: "Cambiar",
      });
      if (!r) return;
      try { await R.api.auth.cambiarPassword(r.actual, r.nueva); toast("Contraseña cambiada"); }
      catch (err) { toast(err.message, "error", 5000); }
    });
  }

  R.vistaAcceso = { iniciar, mostrar, mostrarUsuario, errorLogin };
})(window.PANELIT);

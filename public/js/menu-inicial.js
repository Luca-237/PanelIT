// Tema (oscuro por defecto, claro o según el sistema) y menú lateral recogido: se aplican
// antes de pintar para que no parpadee. Va en un archivo aparte porque la política de
// seguridad de la página no deja correr scripts escritos dentro del HTML.
{
  let t = "oscuro";
  try { t = localStorage.getItem("panelit.tema") || "oscuro"; } catch (e) {}
  document.documentElement.dataset.tema = ["claro", "oscuro", "sistema"].includes(t) ? t : "oscuro";
}
document.addEventListener("DOMContentLoaded", () => {
  try { if (localStorage.getItem("panelit.menu") === "cerrado") document.body.classList.add("menu-cerrado"); } catch (e) {}
});

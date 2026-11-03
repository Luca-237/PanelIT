// =====================================================================
//  Datos INVENTADOS para el modo demo (?demo) y la base local
//  (npm run dev). Nada de esto es real: ni nombres, ni IDs, ni claves.
// =====================================================================
(function (g) {
  const e = (descripcion, tipo, sucursal, extra) => Object.assign({
    descripcion, tipo, sucursal, nombreEquipo: "", usuarioHabitual: "", facturacion: false,
    teamviewerId: "", anydeskId: "", puntoVentaMagnus: "", puntoVentaManager: "",
    usuarioServidor: "", ip: "", etiquetas: [], estado: "activo", observaciones: "",
  }, extra);

  const D = {
    equipos: [
      e("Servidor procesos", "Servidor", "Central", { nombreEquipo: "SRV-PROC-DEMO", usuarioHabitual: "Servidor", teamviewerId: "100200300", anydeskId: "400500600", usuarioServidor: "administrador", ip: "192.168.50.10", clave: "demo-servidor-1" }),
      e("Servidor datos", "Servidor", "Central", { nombreEquipo: "SRV-SQL-DEMO", usuarioHabitual: "Servidor", teamviewerId: "100200301", anydeskId: "400500601", usuarioServidor: "administrador", ip: "192.168.50.11", clave: "demo-servidor-2" }),
      e("PC Caja 1", "PC", "Central", { nombreEquipo: "DEMO-CAJA1", usuarioHabitual: "Ana", facturacion: true, teamviewerId: "111222333", anydeskId: "444555666", puntoVentaMagnus: "7", puntoVentaManager: "103", usuarioServidor: "caja1", etiquetas: ["OK"], clave: "demo-tv-1" }),
      e("PC Caja 2", "PC", "Central", { nombreEquipo: "DEMO-CAJA2", usuarioHabitual: "Bruno", facturacion: true, anydeskId: "444555667", puntoVentaMagnus: "8", puntoVentaManager: "107", usuarioServidor: "caja2" }),
      e("PC Salón", "PC", "Central", { nombreEquipo: "DEMO-SALON", usuarioHabitual: "Usuario1", teamviewerId: "111222334", anydeskId: "444555668", usuarioServidor: "salon", clave: "demo-tv-2" }),
      e("All in one consultas", "All in one", "Central", { nombreEquipo: "DEMO-AIO", usuarioHabitual: "Usuario2", anydeskId: "444555669", usuarioServidor: "salon" }),
      e("Notebook administración", "Notebook", "Central", { nombreEquipo: "DEMO-NB-ADM", usuarioHabitual: "Carla", teamviewerId: "111222335", anydeskId: "444555670", usuarioServidor: "administracion1", clave: "demo-tv-3" }),
      e("Mini PC depósito", "Mini PC", "Central", { nombreEquipo: "DEMO-MINI", usuarioHabitual: "Depósito", anydeskId: "444555671", usuarioServidor: "deposito" }),
      e("PC Caja Peatonal", "PC", "Peatonal", { nombreEquipo: "DEMO-PEAT1", usuarioHabitual: "Diego", facturacion: true, teamviewerId: "111222336", anydeskId: "444555672", puntoVentaMagnus: "5", puntoVentaManager: "105", usuarioServidor: "peatonal1", clave: "demo-tv-4" }),
      e("Caja 1 Córdoba", "PC", "Córdoba", { nombreEquipo: "DEMO-CBA1", usuarioHabitual: "Elena", facturacion: true, teamviewerId: "111222337", anydeskId: "444555673", puntoVentaMagnus: "9", puntoVentaManager: "109", usuarioServidor: "cordoba1", clave: "demo-tv-5" }),
      e("Caja 2 Córdoba", "PC", "Córdoba", { nombreEquipo: "", usuarioHabitual: "Fede", facturacion: true, anydeskId: "444555674", puntoVentaManager: "115", usuarioServidor: "" }),
      e("PC Chimola", "PC", "Chimola", { nombreEquipo: "DEMO-CHIM", usuarioHabitual: "Chimola", anydeskId: "444555675", usuarioServidor: "chimola" }),
      e("Notebook home office", "Notebook", "Home office", { nombreEquipo: "DEMO-HOME", usuarioHabitual: "Gabi", anydeskId: "444555676", usuarioServidor: "administracion1" }),
      e("PC vieja de reposición", "PC", "Central", { nombreEquipo: "DEMO-VIEJA", usuarioHabitual: "—", estado: "baja", observaciones: "Fuente quemada. Se reemplazó por la Mini PC." }),
    ],
    usuariosServidor: ["administrador", "caja1", "caja2", "caja3", "salon", "administracion1", "administracion2", "deposito", "peatonal1", "cordoba1", "cordoba2", "chimola", "invitado"],
    // Páginas: "padre" es el título de la página de arriba; "equipo", la descripción del equipo
    pendientes: [
      { titulo: "Cambiar el mouse de Caja 2", detalle: "El clic derecho falla. Hay uno nuevo en el cajón de sistemas.", estado: "en_curso", prioridad: "alta", responsable: "Luca", equipo: "PC Caja 2" },
      { titulo: "Probar la impresora desde las demás PCs", detalle: "Hoy imprime solo desde una PC.", estado: "pendiente", prioridad: "media", responsable: "", pagina: "Impresora fiscal de Peatonal" },
      { titulo: "Revisar usuarios del servidor repetidos", detalle: "", estado: "pendiente", prioridad: "alta", responsable: "Luca" },
      { titulo: "Pasar el catálogo a la tienda nueva", detalle: "", estado: "pendiente", prioridad: "baja", responsable: "" },
      { titulo: "Armar la base de datos", detalle: "", estado: "hecho", prioridad: "alta", responsable: "Luca" },
    ],
    paginas: [
      { titulo: "Procedimientos", padre: null, fijada: true, etiquetas: ["guías"], bloques: [
        { tipo: "texto", texto: "Paso a paso de las tareas que se repiten." },
        { tipo: "subpagina", pagina: "Alta de una PC nueva" },
        { tipo: "subpagina", pagina: "Impresora fiscal de Peatonal" } ] },
      { titulo: "Alta de una PC nueva", padre: "Procedimientos", etiquetas: [], bloques: [
        { tipo: "titulo", texto: "Antes de entregarla" },
        { tipo: "tareas", texto: "[x] Windows actualizado\n[x] AnyDesk instalado y con contraseña\n[ ] Acceso directo al Escritorio remoto\n[ ] Cargada en el panel" },
        { tipo: "aviso", color: "naranja", texto: "Elegí un usuario del servidor **libre** (Conexión al servidor → Usuarios del servidor)." },
        { tipo: "codigo", texto: "mstsc /v:SERVIDOR" } ] },
      { titulo: "Impresora fiscal de Peatonal", padre: "Procedimientos", equipo: "PC Caja Peatonal", etiquetas: ["impresoras"], bloques: [
        { tipo: "texto", texto: "Si no imprime: apagar 30 segundos y volver a prender **antes** de abrir Manager." } ] },
      { titulo: "Cambiar el mouse de Caja 2", padre: null, equipo: "PC Caja 2", etiquetas: ["pendiente", "hardware"], bloques: [
        { tipo: "texto", texto: "El clic derecho falla. Hay uno nuevo en el cajón de sistemas." },
        { tipo: "separador", texto: "" },
        { tipo: "lista", texto: "Marca: genérico USB\nPedido el 28/10" } ] },
    ],
  };
  if (typeof module !== "undefined" && module.exports) module.exports = D;
  else g.PANELIT_DEMO = D;
})(this);

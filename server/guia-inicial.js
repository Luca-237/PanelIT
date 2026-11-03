// =====================================================================
//  Guía de arranque de "Conexión con el servidor". Se muestra hasta que
//  alguien la edite desde el panel; desde ahí vive en la base.
//  Formato del texto: líneas con "- " son viñetas, **negrita** y `código`.
//  Lo marcado "A confirmar" no está verificado: completarlo en el panel.
//  No poner IPs públicas ni contraseñas acá (este archivo va al repo).
// =====================================================================
module.exports = [
  {
    titulo: "Cómo funciona",
    texto: [
      "Manager2Max (el sistema de gestión y facturación) **no se instala en cada PC**: corre en el servidor. Cada equipo entra al servidor por **Escritorio remoto (RDP)** con su propio usuario de Windows del servidor, y desde esa sesión abre Manager.",
      "- Cada equipo tiene asignado un **usuario del servidor** (columna \"Usuario servidor\" de Equipos). Dos equipos no deberían usar el mismo usuario a la vez: se pisan la sesión.",
      "- Las cajas que facturan tienen además un **punto de venta de Manager** (y de Magnus) propio.",
      "- Si se cae el servidor o la red de Central, **nadie puede facturar**, ni siquiera en las sucursales.",
    ].join("\n"),
  },
  {
    titulo: "Los servidores",
    texto: [
      "- **Servidor procesos — `serverbags`**: Dell PowerEdge T30, Windows Server 2012 R2, IP interna `192.168.0.62` (a confirmar: el router tiene esa IP reservada a `SERVER-SQL`). Corre Manager2Max: es al que se conectan los usuarios por Escritorio remoto.",
      "- **Servidor datos — `SERVER-SQL`**: guarda la base de datos. A confirmar: IP interna y qué más corre.",
      "- Los dos están en Villa María (Central) y se administran con el usuario `administrador`. Las contraseñas de acceso, si están cargadas, están en Equipos → ficha del servidor → Accesos (solo admin).",
      "- ⚠️ Es producción: antes de reiniciar, instalar algo o tocar configuración, avisar a Mauricio. Nunca reiniciar en horario de atención.",
    ].join("\n"),
  },
  {
    titulo: "Red de Central",
    texto: [
      "Internet (SITSA) → módem en modo bridge → router TP-Link TL-ER6120 (`192.168.0.1`, reparte las IP por DHCP) → switch HPE OfficeConnect 1920S → PCs y servidores.",
      "- La impresora compartida HP P1005 cuelga de la PC `compaq` (`192.168.0.87`).",
      "- A confirmar: cómo llegan al servidor las sucursales que no están en la red de Central (Peatonal, Chimola, Córdoba, home office).",
    ].join("\n"),
  },
  {
    titulo: "Conectar una PC nueva",
    texto: [
      "- En la PC: Inicio → escribir **Conexión a Escritorio remoto** (`mstsc`).",
      "- Equipo: la dirección del servidor de procesos. Usuario: el usuario del servidor asignado a esa PC (ver la sección Usuarios del servidor para elegir uno libre).",
      "- En \"Mostrar opciones\" → Guardar como… → dejar el acceso directo `.rdp` en el escritorio con un nombre claro.",
      "- Cargar el equipo en este panel con su usuario del servidor, su ID de AnyDesk/TeamViewer y, si factura, su punto de venta.",
      "- Probar: entrar, abrir Manager, imprimir un comprobante de prueba si es caja.",
    ].join("\n"),
  },
  {
    titulo: "Buenas prácticas para el equipo",
    texto: [
      "- **Cerrar sesión, no cerrar la ventana.** Si se cierra con la X, la sesión queda abierta en el servidor. Se llegaron a acumular más de 400 sesiones colgadas, que trababan el servidor y bloqueaban cuentas.",
      "- No guardar archivos personales en el escritorio del servidor.",
      "- Si el Escritorio remoto pide la contraseña muchas veces y falla, no seguir probando: la cuenta se bloquea. Avisar a sistemas.",
    ].join("\n"),
  },
  {
    titulo: "Problemas conocidos",
    texto: [
      "- **Cartel \"Precaución: conexión remota desconocida\" en cada conexión** (desde la actualización de Windows de abril 2026, KB5082063). Se saca en la PC, como administrador, con:",
      "`reg add \"HKLM\\Software\\Policies\\Microsoft\\Windows NT\\Terminal Services\\Client\" /v RedirectionWarningDialogVersion /t REG_DWORD /d 1 /f`",
      "Microsoft avisó que este arreglo puede dejar de andar en una actualización futura.",
      "- **Sesiones colgadas / cuenta bloqueada:** un admin cierra las sesiones desconectadas desde el Administrador de tareas del servidor → Usuarios.",
      "- **Crystal Reports se cierra al imprimir con fotos:** pasa con imágenes de producto de más de 1200×1200 px.",
    ].join("\n"),
  },
];

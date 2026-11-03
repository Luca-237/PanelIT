// =====================================================================
//  Contenido inicial de las páginas del Panel IT, armado el 03/11/2026 a
//  partir de las notas del vault (infraestructura, servidor de producción,
//  impresora, deploy, descripciones, sync Manager → Odoo, proyectos).
//  Cada página termina con su fuente y la fecha de verificación. Lo que no
//  estaba documentado va en un aviso naranja "A completar", sin inventar.
//  No hay contraseñas ni claves acá (este archivo va al repo).
//  Texto: **negrita** y `código` dentro de una línea. Las listas van con un
//  ítem por línea. Se carga con `npm run cargar-contenido`.
// =====================================================================
const t = texto => ({ tipo: "texto", texto });
const h = texto => ({ tipo: "titulo", texto });
const s = texto => ({ tipo: "subtitulo", texto });
const l = (...items) => ({ tipo: "lista", texto: items.join("\n") });
const tareas = (...items) => ({ tipo: "tareas", texto: items.map(i => "[ ] " + i).join("\n") });
const cod = texto => ({ tipo: "codigo", texto });
const av = (texto, color = "naranja") => ({ tipo: "aviso", texto, color });
const pendiente = texto => av("**A completar:** " + texto, "naranja");
const nota = texto => av(texto, "gris");
const alerta = texto => av(texto, "rojo");
const sep = () => ({ tipo: "separador", texto: "" });
const fuente = texto => nota("Fuente: " + texto);

module.exports = [

  // ===================================================================
  {
    titulo: "Configurar una PC nueva de Cindy",
    etiquetas: ["guías", "equipos"],
    bloques: [
      av("Guía armada el 03/11/2026 con lo que ya estaba documentado. Los pasos y programas que no figuraban en ningún lado quedaron marcados para completar con la práctica de quien arma las PCs."),
      h("Antes de empezar"),
      l(
        "**Usuario del servidor:** elegí uno **libre** en Conexión al servidor → Usuarios del servidor (filtro “Libres”). Dos equipos con el mismo usuario se pisan la sesión de Manager.",
        "**¿Es caja?** Si factura, necesita su propio **punto de venta de Manager** (y de Magnus). No repetir uno que ya usa otra caja.",
        "**Nombre del equipo en Windows**, sucursal, quién la va a usar y el tipo (PC, notebook, all in one, mini PC)."),
      h("Checklist"),
      tareas(
        "Windows actualizado y con la red en perfil **Privada**",
        "Nombre del equipo definido y anotado",
        "AnyDesk instalado, con su ID anotado (y TeamViewer si corresponde)",
        "Acceso directo de Escritorio remoto (`.rdp`) al servidor, con el usuario del servidor elegido",
        "Cartel “Precaución: conexión remota desconocida” desactivado (comando más abajo)",
        "Impresora de Casa Central conectada (ver Conexión al servidor y a las impresoras)",
        "Probar: entrar al servidor, abrir Manager y, si es caja, emitir un comprobante de prueba",
        "Cargar el equipo en el Panel IT: sucursal, usuario del servidor, IDs de acceso remoto y punto de venta",
        "Guardar las contraseñas en Panel IT → ficha del equipo → Accesos (solo las ve un admin)"),
      h("Conectarse al servidor"),
      t("Manager2Max no se instala en cada PC: corre en el servidor y cada equipo entra por **Escritorio remoto (RDP)** con su propio usuario de Windows del servidor."),
      l(
        "Inicio → escribir **Conexión a Escritorio remoto** (o `mstsc`).",
        "Equipo: la dirección del servidor de procesos. Usuario: el usuario del servidor asignado a esta PC.",
        "En “Mostrar opciones” → Guardar como… y dejar el `.rdp` en el escritorio con un nombre claro."),
      cod("mstsc"),
      h("Sacar el cartel de “conexión remota desconocida”"),
      t("Desde abril de 2026 Windows muestra ese cartel en cada conexión (actualización KB5082063). Se desactiva en la PC, ejecutando como **administrador**:"),
      cod('reg add "HKLM\\Software\\Policies\\Microsoft\\Windows NT\\Terminal Services\\Client" /v RedirectionWarningDialogVersion /t REG_DWORD /d 1 /f'),
      nota("Microsoft avisó que este arreglo puede dejar de funcionar en una actualización futura. Si el cartel vuelve, ver la página del servidor de producción."),
      h("Reglas para quien use la PC"),
      l(
        "**Cerrar sesión, no cerrar la ventana.** Si se cierra con la X queda la sesión abierta en el servidor; se llegaron a acumular más de 400 sesiones colgadas que trababan el servidor y bloqueaban cuentas.",
        "No guardar archivos personales en el escritorio del servidor.",
        "Si el Escritorio remoto pide la contraseña muchas veces y falla, no seguir probando: la cuenta se bloquea. Avisar a sistemas."),
      pendiente("programas estándar que lleva toda PC (navegador, Office, antivirus, lector de PDF), cómo se nombra el usuario de Windows, si hay que configurar algo de Magnus además del punto de venta, impresoras fiscales o de etiquetas, y la copia de seguridad."),
      fuente("servidor-produccion, impresora-compartida-hp-p1005 e infraestructura-equipos del vault · planilla EQUIPOS CINDY · Verificado: 2026-11-03"),
    ],
  },

  // ===================================================================
  {
    titulo: "Conexión al servidor y a las impresoras",
    etiquetas: ["servidor", "red", "impresoras"],
    bloques: [
      t("Cómo se conectan las PCs al servidor de Manager, cómo está armada la red de Casa Central y cómo usar la impresora compartida."),
      alerta("**Dato a confirmar:** la nota del servidor de producción dice que `serverbags` (Dell PowerEdge T30, Windows Server 2012 R2) tiene la IP `192.168.0.62`. Pero en el router, la reserva de `192.168.0.62` figura para `SERVER-SQL` y la de `192.168.0.110` para `server`. Verificar con `ipconfig` en cada servidor cuál es cuál y corregir donde corresponda."),
      cod("ipconfig /all"),
    ],
    hijas: [
      {
        titulo: "Escritorio remoto (RDP) al servidor",
        etiquetas: ["servidor"],
        bloques: [
          t("Los equipos entran al servidor de procesos por Escritorio remoto con su usuario del servidor. La lista de usuarios y quién usa cada uno está en **Conexión al servidor** (menú lateral); el paso a paso para una PC nueva, en **Configurar una PC nueva de Cindy**."),
          alerta("Es el servidor de producción: facturación en tiempo real. Antes de reiniciar, instalar algo o tocar configuración hay que avisar a Mauricio; nunca reiniciar en horario de atención."),
          h("Problemas conocidos y cómo se resolvieron"),
          l(
            "**Cartel “Precaución: conexión remota desconocida”** en cada conexión. Causa: actualización de Windows de abril 2026 (KB5082063, por CVE-2026-26151). Arreglo oficial por registro, ver Configurar una PC nueva. La solución definitiva sería firmar el `.rdp` con un certificado digital (no implementada).",
            "**Errores de conexión y bloqueos de cuenta.** Causa: más de 400 sesiones RDP desconectadas acumuladas, por usuarios que cerraban la ventana en vez de cerrar sesión. Un admin las cierra desde el Administrador de tareas del servidor → Usuarios.",
            "**Crystal Reports se cierra al cargar imágenes de producto.** Causa: el runtime se queda sin memoria con imágenes de más de 1200×1200 px. Se armó un script de detección en PowerShell y una fórmula `@RutaImagenSegura` en el `.rpt` afectado. La carpeta de imágenes tiene unos 163.000 JPG en un recurso de red.",
            "**Advertencia de objetos GDI/User** bajo investigación."),
          pendiente("cómo llegan al servidor las sucursales que no están en la red de Casa Central (Peatonal, Chimola, Córdoba y home office): IP pública, VPN u otra cosa."),
          fuente("proyectos/servidor-produccion del vault · Verificado: 2026-11-03"),
        ],
      },
      {
        titulo: "Impresora compartida HP LaserJet P1005 (Casa Central)",
        etiquetas: ["impresoras", "red"],
        bloques: [
          nota("Sin contraseñas en esta página. La clave de `usuario1` la tiene Mauricio: pedírsela a él."),
          h("Cómo está armado"),
          l(
            "**PC “servidor de impresión”:** Compaq All-in-One, nombre `compaq`, Atom D2550 1,86 GHz, 4 GB de RAM, Windows 8.1 Pro 64 bits.",
            "**IP:** `192.168.0.87`, reservada en el router.",
            "**Impresora:** HP LaserJet P1005 por **USB** (sin red ni Wi-Fi), conectada a la Compaq.",
            "**Recurso compartido:** `\\\\192.168.0.87\\HP LaserJet P1005`.",
            "**Usuario de red:** `compaq\\usuario1` (cuenta local de la Compaq).",
            "También hay otra carpeta compartida en la Compaq, `softech`: revisar si es intencional."),
          h("Conectar una PC cliente (Windows 10 / 11)"),
          s("Una sola vez por PC"),
          tareas(
            "Borrar credenciales viejas: `Win + R` → `control keymgr.dll` → Credenciales de Windows → eliminar las que digan `compaq` o `192.168.0.87`",
            "Poner la red en perfil **Privada** (Configuración → Red e Internet → Propiedades)"),
          s("Conectar"),
          l(
            "`Win + R` → `\\\\192.168.0.87` → Enter.",
            "Usuario `compaq\\usuario1` y su contraseña. Marcar “Recordar mis credenciales”.",
            "Clic derecho en **HP LaserJet P1005** → **Conectar**. Aceptar el driver y esperar.",
            "Probar: Configuración → Impresoras y escáneres → la impresora → Propiedades → **Imprimir página de prueba**."),
          av("**Siempre por IP, no por nombre.** Algunas PCs no resuelven `compaq` (resolución de nombres entre Windows 8.1 y las versiones nuevas), y por eso fallaba al principio.", "naranja"),
          s("Plan B si se cuelga o da error (0x0000011b, 0x00000709, 0x00000bcb)"),
          t("Instalar a mano el driver de la P1005 (Windows 64 bits, de HP o Windows Update) y agregar la impresora como **local**, con un puerto nuevo de tipo “Puerto local” llamado:"),
          cod("\\\\192.168.0.87\\HP LaserJet P1005"),
          h("Errores que aparecieron"),
          l(
            "**Algunas PCs ven `\\\\compaq` y otras no:** resolución de nombres. Usar la IP.",
            "**Usuario o contraseña “inválidos”:** el usuario que se había creado no existía en la Compaq (error de sistema 1326). Usar `usuario1`; se puede ver con `net user` en la Compaq.",
            "**`net view ... /user:` da “opción desconocida”:** `net view` no acepta `/user`. Usar `net use \\\\IP\\IPC$ /user:compaq\\usuario1 *` y después `net view \\\\IP`.",
            "**Hay que mover el mouse para que imprima:** la Compaq entra en suspensión (ver abajo)."),
          h("La Compaq no debe dormirse"),
          t("Si se suspende, nadie imprime hasta que se la despierta. En la Compaq, en cmd **como administrador**:"),
          cod("powercfg /change standby-timeout-ac 0\npowercfg /change standby-timeout-dc 0\npowercfg /change hibernate-timeout-ac 0\npowercfg /change hibernate-timeout-dc 0\npowercfg /hibernate off"),
          l(
            "Administrador de dispositivos: desmarcar “Permitir que el equipo apague este dispositivo para ahorrar energía” en el adaptador de red y en los “Concentrador raíz USB”.",
            "Windows Update: “descargar pero permitirme elegir cuándo instalar”.",
            "Opcional, en el BIOS: “Restore on AC Power Loss”, para que encienda sola después de un corte de luz."),
          av("Los comandos de energía se le pasaron a Mauricio, pero **no está confirmado que los haya ejecutado**.", "naranja"),
          h("Seguridad y mantenimiento"),
          l(
            "Windows 8.1 no recibe parches desde enero de 2023: usar la Compaq solo para imprimir (sin navegar ni abrir mails).",
            "Windows 11 no se puede instalar en esa Compaq (el Atom D2550 es de 2012, sin TPM 2.0). Alternativas evaluadas: Windows 10 de 64 bits o Linux liviano con CUPS; la P1005 en Linux necesita cargar firmware en cada encendido, por eso Windows es más estable.",
            "Para imprimir alcanza un usuario **estándar**.",
            "Después de un corte de luz o un reinicio, si no sale nada: apagar y volver a encender la impresora.",
            "En las PCs cliente conviene tener **desactivado** el uso compartido de archivos e impresoras en redes públicas."),
          nota("Estado: imprime desde la PC de Mauricio (Windows 11). Las demás PCs de la red están sin probar."),
          fuente("conocimiento/impresora-compartida-hp-p1005 del vault · Verificado: 2026-10-20"),
        ],
      },
      {
        titulo: "Red de Casa Central",
        etiquetas: ["red"],
        bloques: [
          h("Cómo está armada"),
          t("Internet (SITSA) → módem en modo **bridge** → router **TP-Link TL-ER6120** (`192.168.0.1`, reparte las IPs por DHCP) → switch **HPE OfficeConnect 1920S** (JL381A) → PCs y servidores."),
          l(
            "El switch no se configura para compartir la impresora.",
            "La Compaq (servidor de impresión) tiene la IP `192.168.0.87`."),
          h("Reservas DHCP en el router"),
          t("Network → LAN → pestaña **DHCP Reservation**. Hay cuatro reservas anteriores y una agregada el 20/10/2026:"),
          l(
            "`SERVER-SQL` → `192.168.0.62`",
            "`server` → `192.168.0.110`",
            "Compaq (impresora P1005), MAC `00-25-AB-31-2F-73` → `192.168.0.87` (entrada Nº 5, creada el 20/10/2026; para deshacerla, el tacho de esa fila)",
            "Una entrada de “941” repetida dos veces (sin identificar)."),
          pendiente("las IPs fijas de los demás equipos, el plano de la red (qué cuelga de qué), las otras sucursales y qué hace el equipo `server`."),
          fuente("conocimiento/impresora-compartida-hp-p1005 e infraestructura-equipos del vault · Verificado: 2026-10-20"),
        ],
      },
    ],
  },

  // ===================================================================
  {
    titulo: "Alta, baja y descripciones de artículos",
    etiquetas: ["artículos", "e-commerce"],
    bloques: [
      t("Cómo entra un artículo nuevo, cómo se saca de la web cuando se queda sin stock y cómo se buscan y cargan las descripciones. El maestro de artículos es **Manager**; de ahí se reparte a las páginas."),
      h("Las páginas donde se publica"),
      l(
        "**Cindy Mayorista** — hoy en TiendaQuick (`cindymayorista.com.ar`); la tienda nueva en Tiendanube es `cindymayorista2.mitiendanube.com`. El pase estaba previsto para alrededor del **12/11/2026** (a confirmar).",
        "**Punto Mayorista** — `puntomayorista.ar` (TiendaQuick) y `nuevo.puntomayorista.ar`, que es el sitio nuevo dentro de Odoo (website 2). La migración del dominio real quedó postergada.",
        "**Travel Blue minorista** — `travelblue.com.ar` (WooCommerce).",
        "**Catálogo mayorista Travel Blue** — `bagsstore.com.ar/travelblue/` (PHP/MySQL propio).",
        "**Cindy Preventa** — catálogo de preventas con control de stock."),
      pendiente("cuál es hoy el sitio principal de Cindy Mayorista y cuándo se hace el pase a Tiendanube; el circuito de Chimola."),
    ],
    hijas: [
      {
        titulo: "Alta de artículos nuevos",
        etiquetas: ["artículos"],
        bloques: [
          h("Quién hace qué"),
          l(
            "**Carga administrativa (Antonella):** da de alta el artículo nuevo o actualiza su costo en Manager, le asigna el **rubro**, carga la Orden de Compra, ingresa el remito a stock y gestiona reclamos por faltante o sobrante.",
            "**Contenido (equipo de e-commerce):** buscar imágenes o pedirlas al proveedor, convertirlas y organizarlas, sacar fotos, cargar las imágenes, categorizar y dar de alta en la página.",
            "**Tarea diaria:** “Códigos para dar de alta” (tablero de tareas)."),
          h("Cómo llega a las páginas"),
          l(
            "En Manager, un artículo se publica en e-commerce cuando tiene **`Sube = 1`** (es un 0/1, no un tilde). De unos 41.500 artículos vigentes, unos 7.200 tienen `Sube = 1`.",
            "**Manager → Odoo:** un script propio lee los artículos modificados cada 5 minutos y los crea o actualiza en Odoo (precio, stock, categoría, imágenes). Ver Funcionamiento del inventario entre Manager y las páginas.",
            "**Odoo → Tiendanube:** por el conector Devoo. En pruebas del 18/09/2026 el producto creado queda **oculto** (casilla “Mostrar en Tienda Nube” sin marcar) hasta publicarlo a propósito.",
            "**Variantes de color:** cada color es un artículo con sufijo en el código (`123445-WHI`, `-GRE`, `-BLU`, `-NUD`, `-NEG`, `-BEI`, `-SUE`, `-ROJ`) y el artículo principal es el padre. La descripción se carga una sola vez en el padre.",
            "**Travel Blue minorista (WooCommerce):** tiene su propia sincronización con Manager y una carga por CSV; el catálogo mayorista trae de Manager todos los artículos de sus 3 marcas en cada corrida."),
          h("Herramienta de apoyo: Control de llegada de mercadería"),
          t("Planilla propia (Supabase) que cruza las órdenes de compra y los remitos de Manager: qué llegó, qué falta, qué hay que subir a la página (filtro “Subir a la página”: llegó + todavía no cargado en la web + con stock). Al marcar “Cargado web” guarda la fecha de alta sola, y tiene el botón **Revisar en la web** para ver si el código ya está publicado antes de cargarlo dos veces."),
          pendiente("el paso a paso de la carga en cada página (campos obligatorios, fotos y tamaños, categorías, precios), quién autoriza el alta y cómo se avisa que ya está publicado."),
          fuente("aportes de Mariela y Luca, conocimiento/manager2max, proyectos/migracion-odoo-tiendanube y sync-manager-odoo del vault · Verificado: 2026-11-03"),
        ],
      },
      {
        titulo: "Baja de artículos (sacar de la web)",
        etiquetas: ["artículos", "automatización"],
        bloques: [
          t("Cuando un artículo se queda sin stock se saca de la web poniendo **`Sube` de 1 a 0** en Manager. El aviso lo da el depósito por WhatsApp."),
          h("Circuito actual"),
          l(
            "El depósito escribe los códigos sin stock en el grupo de WhatsApp **“Código que no hay más”**.",
            "Un **bot** escucha el grupo, extrae los códigos y los valida contra Manager (**solo lectura**).",
            "Un **panel web** muestra la lista a bajar (el artículo padre y sus variantes) y detecta solo cuándo ya quedó cargada.",
            "**Una persona** hace la baja en Manager con edición masiva. El bot **no escribe** en Manager: lo hizo así a propósito, por el riesgo de tocar producción.",
            "**Rutina diaria:** no mostrar en la web los códigos de “Códigos que no hay más” y corrección de stock (0/1)."),
          h("Estado al 27/10/2026"),
          l(
            "Dos procesos corriendo en la VPS de DonWeb de Cindy (PM2): el listener de WhatsApp y el panel. Base con 366 códigos distintos y 384 reportes desde el 16/10; ningún mensaje del grupo perdido en 11 días.",
            "El **validador está atascado** (problema abierto n.º 1): 112 códigos sin validar.",
            "El **panel no se puede abrir desde afuera**: escucha solo en el servidor (`127.0.0.1:3010`), sin nginx ni dominio. Falta decidir cómo publicarlo.",
            "Responsable desde el 27/10/2026: **Luca**. El detalle y los próximos pasos están en la nota del proyecto del vault."),
          pendiente("el procedimiento exacto de la edición masiva en Manager (qué pantalla, qué columnas), quién la hace y a qué hora, y qué hacer si el código tiene variantes."),
          fuente("proyectos/tiendaquick-baja-informacion-whatsapp del vault · Verificado: 2026-10-27"),
        ],
      },
      {
        titulo: "Buscar y cargar descripciones",
        etiquetas: ["descripciones", "automatización"],
        bloques: [
          t("Proceso para tener la descripción de cada producto en la web: verificar que el código esté publicado, conseguir las medidas, escribir una lista corta y cargarla en Odoo, que se la pasa a Tiendanube."),
          nota("**Regla madre:** si el dato no está en el nombre, en una fuente confiable del modelo exacto o no se ve en la foto, no se escribe. Mejor una línea de menos que un dato inventado."),
          h("1. Verificar que el código está en la web"),
          l(
            "El producto **existe** solo si en la página aparece un código **idéntico** al buscado (buscar `8216` también trae `148216`).",
            "Si aparece solo una variante (`5B320-BEI` cuando se busca `5B320`) o no aparece, **no está**: se marca “Ya no está en la página” y no se escribe descripción.",
            "A mano: buscar el código en la tienda. Automático: botón **Revisar en la web** del Control de llegada de mercadería (de a 10 artículos, con pausa de 5 s), que usa el mismo criterio."),
          h("2. Conseguir las medidas"),
          t("Obligatorias en bolsos, carteras, mochilas, morrales, riñoneras, billeteras, neceseres, fundas de notebook, valijas, paraguas, almohadas de viaje, textiles, cintos, cartucheras y loncheras. En envases (termos, botellas, vasos) va la **capacidad** en ml. Siempre en **centímetros**, con el orden (alto x ancho x profundidad) cuando la fuente lo da."),
          l(
            "Método: código en la web de Cindy → **foto del producto** → **Google Lens** con esa imagen. No buscar por texto en Google.",
            "En Lens, en “Add to your search”, escribir: producto, marca, `art` y el **código del proveedor** (el código de Cindy **sin el primer dígito**), y “medidas alto ancho profundidad cm”.",
            "Leer el “AI Overview” y **aceptar solo si nombra ese código o artículo**. Rechazar “línea de códigos”, “medidas estándar”, “aproximado”, rangos o un código distinto.",
            "Si una dimensión viene en rango, escribir solo las dimensiones firmes."),
          h("3. Escribir la descripción"),
          t("En la planilla “Proceso Ecommerce” (columna U, “Descripción Web”), una línea por dato con viñeta. Se escribe solo en U y W; las filas con prosa escrita por otra persona o proveedor no se tocan."),
          h("4. Cargarla en Odoo → Tiendanube"),
          l(
            "Desde el 24/10/2026 las descripciones **se cargan en Odoo**; Odoo se las pasa a Tiendanube. No se cargan a mano en Tiendanube, porque Odoo la pisaría.",
            "Ventas → Productos → el producto → pestaña **Ventas** → caja de abajo, **“Descripción de presupuesto”**. **No** usar “Descripción de eCommerce”: esa no llega a Tiendanube.",
            "Guardar y tocar **“Actualizar en Tienda Nube”**. Si en cambio dice “Crear en Tienda Nube”, el producto todavía no está en la tienda: no tocarlo y avisar a Mauricio.",
            "Comprobar en el admin de Tiendanube que salga como lista, sin ver `<li>` ni símbolos raros."),
          h("Automatización"),
          l(
            "**Verificar y completar la planilla:** Claude con la habilidad *descripciones-web-cindy* (verifica el código en la web, busca medidas con Lens y completa U y W).",
            "**Cargar en Odoo:** la habilidad *cargar-descripciones-en-odoo* y su script `carga_descripciones.ps1`: baja la planilla, busca cada código en Odoo, convierte las viñetas a `<ul><li>`, saca el color en productos con variantes y manda a Tiendanube. **Siempre se corre primero sin `-Escribir`** para revisar qué cargaría; el log guarda la descripción anterior para deshacer.",
            "**Revisar en la web:** botón del Control de llegada de mercadería, ver arriba."),
          av("La clave de la API de Odoo va en la variable de entorno `ODOO_API_KEY`. **Nunca se pega en un chat.** Si se pegó, hay que revocarla y generar otra (Odoo → Mi perfil → Seguridad de la cuenta → Claves API).", "rojo"),
          pendiente("cuántos artículos faltan hoy de describir, y cómo se reparte el trabajo entre Luca y el resto del equipo."),
          fuente("guia-cargar-descripciones-odoo-tiendanube, habilidades descripciones-web-cindy y cargar-descripciones-en-odoo del vault · Verificado: 2026-10-26"),
        ],
        hijas: [
          {
            titulo: "Plantilla de la descripción (Odoo → Tiendanube)",
            etiquetas: ["descripciones"],
            bloques: [
              t("La caja de Odoo es de texto simple. Para que en Tiendanube salga una lista prolija hay que pegar este esqueleto y completar. **Los saltos de línea no se ven en la tienda**: lo que arma la lista son las marcas `<li>`."),
              cod("<ul>\n<li>Marca y Modelo: </li>\n<li>Tipo de producto: </li>\n<li>Medidas: </li>\n<li>Material: </li>\n<li>Diseño: </li>\n<li>Incluye: </li>\n</ul>"),
              h("Reglas"),
              l(
                "Una característica por línea, con el formato `<li>Etiqueta: valor.</li>`. No olvidar el `</li>`.",
                "**Borrar las líneas que no se tienen.** No dejar etiquetas vacías.",
                "Etiquetas ya usadas (no inventar otras): Marca y Modelo, Tipo de producto, Medidas, Material, Diseño, Contenido, Capacidad, Incluye, Detalles, Composición, Edad recomendada, Presentación.",
                "Medidas con unidad y orden: `42 x 30 x 13 cm (alto x ancho x profundidad)`.",
                "Con tildes y eñes normales; cada línea termina con punto.",
                "No repetir el nombre del producto. Nada de precios, teléfonos, links ni frases de venta.",
                "**No pegar desde Word, Excel ni una página web** (arrastran formato oculto). Pegar primero en el Bloc de notas."),
              h("Productos con variantes de color"),
              l(
                "La descripción **no nombra el color** (decisión del 23/10/2026).",
                "Se carga **una sola vez, en el producto principal** (el que tiene la pestaña “Atributos y variantes”), nunca en cada variante.",
                "Mal: “Trendy, Mochila Gris”. Bien: “Trendy, Mochila”. Tampoco el color en “Diseño”.",
                "Lo que es igual en todos los colores (medidas, material, capacidad) sí va.",
                "Productos **sin variantes**: ahí sí se puede poner `Color:`."),
              h("Ejemplo real, ya cargado"),
              cod("<ul>\n<li>Marca y Modelo: Cresko, Set Plato, Bowl y Vaso River Plate.</li>\n<li>Medidas: Plato de 22 cm, bowl de 17 cm y vaso de 350 ml.</li>\n<li>Contenido: 3 piezas (plato, bowl y vaso).</li>\n<li>Diseño: Rojo y blanco con escudo de River Plate.</li>\n</ul>"),
              h("Qué no hacer"),
              l(
                "No cargar la descripción directo en Tiendanube ni en “Descripción de eCommerce”.",
                "No tocar la descripción de cada variante por separado.",
                "No cambiar nombre, precio ni categorías (se manejan desde Manager y el sync)."),
              alerta("“Descripción de presupuesto” es el campo que Odoo copia a presupuestos y facturas: con las marcas `<li>` podrían verse en los PDF. Hoy se cotiza desde Manager, así que no pasa; hay que resolverlo antes de cotizar desde Odoo."),
              fuente("conocimiento/guia-cargar-descripciones-odoo-tiendanube del vault · Verificado: 2026-10-24"),
            ],
          },
        ],
      },
    ],
  },

  // ===================================================================
  {
    titulo: "Despliegue completo en Ferozo",
    etiquetas: ["deploy", "hosting"],
    bloques: [
      t("Cómo se publica un proyecto web en el hosting de Cindy (Ferozo / DonWeb). Todo pasa por **GitHub → Ferozo**: no se sube nada por FTP ni a mano."),
      av("Esto vale para los proyectos **PHP/estáticos** (catálogos, panel de bagsstore, gestores). **El Panel IT es una app Node.js y no corre en Ferozo**: ver su guía de despliegue (propuesta: la VPS de DonWeb de Cindy).", "rojo"),
      h("El hosting"),
      l(
        "Plan **Web Hosting Emprendedor** (Linux), con vencimiento el 30/05/2027.",
        "Servidor `c205.ferozo.com`, **PHP 8.4 FPM** (pasó de 8.0 a 8.4 el 22/10/2026 por vulnerabilidades críticas de PHP) y **MySQL 5.7**.",
        "Panel: `ferozo.host`, cuenta `td000310`. Acceso rápido: DonWeb → Mi Cuenta → Web Hosting → Panel hosting (entra solo).",
        "**Probar siempre con la misma versión de PHP que producción** (el Docker de prueba usa PHP 8.4)."),
      h("Flujo de cada cambio"),
      cod("git add <archivos>\ngit commit -m \"descripción\"\ngit push"),
      l(
        "Después del push, **Deploy en Ferozo**: panel → Mi Sitio Web → **GIT** → botón **Desplegar**.",
        "Algunos proyectos tienen **Implementación automática** (ver abajo): ahí cada push a `main` se publica solo.",
        "En cada cambio de archivos estáticos, **subir el `?v=` de `index.html`** para que el navegador no use una versión vieja guardada."),
      h("Publicar un proyecto nuevo (paso a paso)"),
      tareas(
        "Crear el repositorio en GitHub (**privado** si es posible; ver la limitación de más abajo)",
        "Ferozo: crear el **subdominio** (por ejemplo `panel.bagsstore.com.ar`) apuntando a `public_html/<carpeta>`",
        "**Borrar el `cgi-bin` vacío** que crea Ferozo al dar de alta el subdominio: el deploy exige que la carpeta esté vacía",
        "Activar el **certificado SSL** (Let's Encrypt) del subdominio",
        "Mi Sitio Web → GIT: conectar el repositorio **por HTTPS**, rama `main`, directorio `/public_html/<carpeta>/`",
        "Desplegar y probar en el navegador, con la sesión cerrada y abierta",
        "Comprobar que los archivos internos **no se pueden leer** (`.git`, `.md`, `package.json`, bases de datos, `pruebas/`): deben dar 403 o 404",
        "Opcional: activar la **Implementación automática** y cargar su URL en GitHub → Settings → Webhooks (evento `push`)"),
      h("Repositorios privados: la limitación de la clave SSH"),
      t("La clave SSH de Ferozo es **una sola por cuenta, fija, y no se puede regenerar**. Ya está usada como *deploy key* en otro repositorio privado (`devoluciones_cindy`), y GitHub no deja repetirla (“Key is already in use”). Por eso dos proyectos (Preventa y el panel de bagsstore) quedaron en repositorios **públicos**, sin secretos adentro."),
      l(
        "**Para mantener un repo privado:** Ferozo → GIT **por HTTPS con un token de GitHub** (*fine-grained*): solo ese repositorio, permiso **Contents: Read-only**, vence en 1 año.",
        "URL: `https://USUARIO:TOKEN@github.com/USUARIO/REPO.git`. El token queda en `.git/config` del servidor, que el `.htaccess` bloquea.",
        "**El token no va al vault ni al chat.** Anotar la fecha de vencimiento para renovarlo."),
      h("Implementación automática (webhook)"),
      t("La sección GIT de Ferozo tiene la opción nativa **“Implementación automática”**, que da una URL. Cargándola como webhook en GitHub (evento `push`), cada push a `main` se publica solo. Verificado en el catálogo de Travel Blue (26/08/2026) y en el panel de bagsstore (15/10/2026). Si alguna vez no actualiza: botón **Desplegar**."),
      h("Archivos que protegen el sitio"),
      l(
        "Un `.htaccess` por carpeta sensible (por ejemplo `data/`) que bloquea el acceso: se verifica con una prueba que dé 403.",
        "Las bases locales (SQLite) van en `.gitignore`: no se versionan.",
        "El `.htaccess` de `public_html` es **uno solo y lo usan todos los sitios del dominio**: tocarlo con una línea por vez y anotar cuál era la anterior para poder volver atrás."),
      h("Proyectos que se publican así"),
      l(
        "**Catálogo mayorista Travel Blue:** `bagsstore.com.ar/travelblue/` — repo `mauriciomre/travelblue` — con implementación automática.",
        "**Gestor de Devoluciones:** `bagsstore.com.ar/devoluciones/` — repo `mauriciomre/gestor_devoluciones`.",
        "**Panel de bagsstore:** `panel.bagsstore.com.ar` — repo `mauriciomre/panel_cindy` — con webhook.",
        "**Cindy Preventa** y otras herramientas del equipo (Rótulos, Gestor de RRHH, Control de llegada de mercadería): subdominios de `bagsstore.com.ar`; el de Compras estaba previsto como `compras.bagsstore.com.ar`."),
      h("Volver atrás"),
      cod("git revert <commit>\ngit push\n# y Desplegar en Ferozo (o esperar el webhook)"),
      h("Riesgos"),
      l(
        "**Raíz del dominio:** `bagsstore.com.ar/` redirige (301) al panel; el catálogo de Travel Blue se abre solo por `bagsstore.com.ar/travelblue/`. Los 301 se guardan en el navegador de quien ya entró.",
        "**SQLite en Ferozo con PHP 8.0 devolvía los enteros como texto** y `\"0\"` es verdadero en JavaScript: todo aparecía oculto o favorito. La API tiene que convertir a número.",
        "Mails del dominio: el reenvío del webmail de Ferozo a Gmail falla en silencio con algunos mensajes (revisar SPF/DMARC)."),
      pendiente("el estado actual de la implementación automática en cada proyecto, quién tiene acceso al panel de Ferozo y a GitHub, y el vencimiento de los tokens."),
      fuente("conocimiento/deploy-hosting, proyectos/panel-cindy, travelblue-catalogo-mayorista y cindymayorista-sitio del vault · aportes de Luca · Verificado: 2026-11-03"),
    ],
  },

  // ===================================================================
  {
    titulo: "Funcionamiento del panel de bagsstore",
    etiquetas: ["panel", "bagsstore"],
    bloques: [
      t("El **Panel Cindy** es un menú de herramientas para todo el equipo, parecido al menú de Odoo: reúne los accesos a preventa, catálogo Travel Blue, devoluciones, Tazkeo, Odoo, Tiendanube y lo que se vaya sumando. Producción: **`panel.bagsstore.com.ar`** (desde el 14/10/2026)."),
      h("Cómo se usa"),
      l(
        "Se entra con **usuario y contraseña propios**. La primera visita del sistema pide crear el administrador.",
        "Roles: **admin** y **usuario**.",
        "**Cada usuario arma el suyo:** marca herramientas como favoritas, oculta las que no usa, las reordena (con flechas o arrastrando) y agrega enlaces propios.",
        "El **admin** define el catálogo de herramientas y las categorías del equipo, y elige si una herramienta o categoría la ven todos o solo admin.",
        "Buscador con la tecla `/`, y botón para restaurar el panel."),
      h("Cómo está hecho"),
      l(
        "PHP 8 + SQLite (`data/panel.sqlite`): no hace falta crear base en Ferozo. La base está bloqueada por `data/.htaccess` (da 403) y fuera de git.",
        "Frontend en HTML, CSS y JS sin frameworks, con íconos Lucide, tipografías Jost y Lora y el naranja `#e84e1b`.",
        "Prueba local: `docker compose up -d --build` → `http://localhost:8082`."),
      h("Despliegue"),
      l(
        "Subdominio `panel.bagsstore.com.ar` → `public_html/panel`, repositorio `mauriciomre/panel_cindy` (**público**: no tiene secretos), conectado por HTTPS, rama `main`. Ver Despliegue completo en Ferozo.",
        "**Despliegue automático** por webhook de GitHub (evento push) con la URL de “Integración automática” de Ferozo.",
        "**Redirección de la raíz:** `bagsstore.com.ar/` y `www.bagsstore.com.ar/` van al panel. Se hizo cambiando **una línea** del `.htaccess` de `public_html`: `RewriteRule ^$ /travelblue/ [L,R=301]` pasó a `RewriteRule ^$ https://panel.bagsstore.com.ar/ [L,R=301]`. Para volver atrás, poner la línea anterior. Las rutas `/travelblue/`, `/preventa/` y `/devoluciones/` siguen igual."),
      h("Estado"),
      l(
        "Hecho y probado: alta del primer admin desde pantalla, login, roles, favoritas, ocultar, reordenar, enlaces propios, categorías y usuarios, buscador, restaurar y celular sin desborde.",
        "Herramientas cargadas de arranque: Preventa (con su admin), Travel Blue (con su admin), Devoluciones, Tareas (Tazkeo), Odoo y Tiendanube. **No incluye el Dashboard de ventas** porque no se conoce su URL de producción.",
        "Ideas pendientes: indicador de salud (punto verde o rojo) de cada herramienta, y versión instalable (PWA).",
        "Falta probarlo en un teléfono real."),
      pendiente("si el admin ya fue creado, quiénes tienen usuario, y las herramientas que faltan agregar (Panel IT, Rótulos, Gestor de RRHH, Control de llegada de mercadería, Dashboard de ventas)."),
      fuente("proyectos/panel-cindy del vault · Verificado: 2026-10-22"),
    ],
  },

  // ===================================================================
  {
    titulo: "Funcionamiento del inventario entre Manager y las páginas",
    etiquetas: ["inventario", "manager", "odoo", "sync"],
    bloques: [
      t("**Manager2Max** es el sistema maestro: ahí viven los artículos, los precios por lista y el stock por depósito. Todo lo que se ve en las páginas sale de ahí, por distintos caminos."),
      h("El mapa"),
      l(
        "**Manager → Odoo:** script propio de sincronización (corre en la VPS de DonWeb de Cindy, cada 5 minutos).",
        "**Odoo → Tiendanube:** por el conector **Devoo**, instalado y configurado por GEI.",
        "**Manager → Punto Mayorista (sitio nuevo en Odoo):** pasa por el mismo sync de Odoo.",
        "**Manager → TiendaQuick (cindymayorista.com.ar y puntomayorista.ar):** el artículo se publica con **`Sube = 1`**; es el circuito histórico que Tiendanube va a reemplazar.",
        "**Manager → Travel Blue minorista (WooCommerce):** sincronización propia, con panel de administración dentro del catálogo.",
        "**Manager → catálogo mayorista de Travel Blue (PHP):** en cada corrida trae todos los artículos de sus 3 marcas (Travel Blue, Anomeo, Slooth), sin filtro de fecha."),
      h("Manager → Odoo: cómo funciona el sync"),
      l(
        "**Polling delta:** cada 5 minutos pide a Manager los artículos modificados desde el último punto guardado (*checkpoint*) y los crea o actualiza en Odoo, con su categoría, precio por lista, stock por depósito e imágenes.",
        "**Artículo, precio y stock son tres fuentes independientes en Manager**, cada una con su propia fecha de grabación (confirmado por el desarrollador de Manager el 16/09/2026). La fecha del artículo **no** cambia cuando cambia el precio o el stock: por eso el sync consulta también las tablas de precio y de stock.",
        "**Manager no ordena los resultados** por defecto. Se encontró (24/09) que eso hacía perder artículos para siempre; el sync ahora pide **orden explícito por fecha**. Las bajas (`Vigente = False`) van en una pasada aparte.",
        "**Imágenes:** se redimensionan a 1920 px del lado largo y se recomprimen a JPEG calidad 85 antes de subirlas, porque Manager las sirve tal cual se cargaron (4 a 5 MB) y eso cortaba la conexión y agotaba la memoria.",
        "**Si algo falla:** el checkpoint no avanza más allá del artículo fallido (a propósito, para no perder datos en silencio), y reintenta en la corrida siguiente.",
        "Hay un **panel de administración** del sync, con el estado de las corridas."),
      h("Qué se sincroniza"),
      l(
        "Universo: unos 41.500 artículos vigentes en Manager, de los cuales unos 7.200 tienen `Sube = 1`. El plan acordado el 18/09/2026: todo el catálogo vigente pasa a Odoo y **todo `Sube = 1` queda creado, categorizado, con precio mayorista y publicado en Tiendanube sin intervención manual**.",
        "**Precios:** se usan las listas de precio de Manager (7 en el sync); a Tiendanube va la lista **Mayorista (ARS)**, sin IVA.",
        "**Stock:** 4 depósitos activos, con los códigos de Odoo `WH/Stock`, `CBA/RI` (Rivera Indarte), `VM/SM` (VM San Martín) y `PS` (Depósito P. Seppey). En Tiendanube se decidió **stock ilimitado** para todos los artículos (23/09/2026).",
        "**Variantes:** decisión del 18/09/2026, ahora son **variantes reales** (el color sale de comparar la descripción de la variante con la del padre), no productos sueltos con el stock solo en el padre.",
        "**Categorías:** el árbol de Tiendanube es un espejo del árbol de “categorías de comercio electrónico” de Odoo, que viene de Manager."),
      h("Cómo se sacan artículos de la web"),
      t("Poniendo `Sube = 0` en Manager. Ver Baja de artículos."),
      h("Cuidados"),
      l(
        "Manager es producción: el sync **solo lee** de Manager.",
        "Cada persona usa su **propia clave de API** de Odoo; la del sync es de un usuario de servicio sin permisos de sitio web ni de vistas.",
        "Los cambios en Odoo llegan a la tienda: probar siempre primero en el entorno de pruebas.",
        "Si un precio o stock “no llega” a una página, el primer sospechoso es el delta: ver si la fecha del artículo cambió o solo cambió el precio o el stock."),
      pendiente("el estado de hoy del sync (artículos pendientes, última corrida), el pase de TiendaQuick a Tiendanube y qué pasará con el sync de Travel Blue WooCommerce cuando un artículo tenga `Sube = 0`."),
      nota("Hay otro sync parecido, para **clientes** (Manager + Clientify → Odoo), descripto en la nota sync-clientes-odoo del vault."),
      fuente("proyectos/sync-manager-odoo, migracion-odoo-tiendanube, travelblue-catalogo-mayorista y conocimiento/manager2max del vault · Verificado: 2026-09-25 (sync) y 2026-11-03 (resumen)"),
    ],
  },

  // ===================================================================
  {
    titulo: "Proyectos a futuro y actuales",
    etiquetas: ["proyectos"],
    bloques: [
      t("Mapa de lo que está en marcha en Cindy y de lo que viene. Cada línea apunta a la nota del vault donde está el detalle."),
      pendiente("prioridades, responsables y fechas de cada proyecto. Acá solo figura lo que estaba documentado."),
    ],
    hijas: [
      {
        titulo: "Proyectos actuales",
        etiquetas: ["proyectos"],
        bloques: [
          h("Migración a Odoo + Tiendanube"),
          l(
            "Reemplazar Manager2Max (ERP), Clientify (CRM) y TiendaQuick (tienda) por **Odoo** y **Tiendanube Evolución**. Guía de implementación: **GEI** (consultora partner de Odoo, Guillermo). Responsable técnico: Mauricio; decisiones de negocio: Mariela.",
            "Estado: etapa 1 en marcha desde el 21/08/2026. Sync de artículos y de clientes en producción; CRM configurado con embudos por campaña; WhatsApp sin decidir (opciones en evaluación); pase de la tienda previsto para alrededor del 12/11/2026."),
          s("Sub-proyectos"),
          l(
            "**Sync Manager → Odoo** (artículos) y **sync de clientes** Manager + Clientify → Odoo.",
            "**Punto Mayorista en Odoo:** `nuevo.puntomayorista.ar` (website 2), con repositorio y sitio de pruebas propio; el dominio real quedó postergado.",
            "**Tema de Tiendanube:** CSS y scripts de la ficha de artículo.",
            "**Línea de WhatsApp para estampados y personalizados:** en análisis, nada decidido."),
          h("Herramientas internas"),
          l(
            "**Tazkeo** (gestor de tareas del salón y el depósito): app propia, en producción en `tazkeo.com.ar` y `tareas.bagsstore.com.ar`.",
            "**Baja automática de “sube información” por WhatsApp:** bot y panel en la VPS; validador atascado y panel sin acceso externo. Responsable: Luca.",
            "**Control de llegada de mercadería (Compras):** planilla propia con Supabase. Responsable: Luca.",
            "**Gestor de RRHH:** novedades laborales, horas, vacaciones, calendario. Responsable: Luca.",
            "**Generador de rótulos de envío.** Responsable: Luca.",
            "**Gestor de devoluciones a proveedores** (PHP + SQLite).",
            "**Dashboard de ventas** (PHP/MySQL + Manager), en desarrollo.",
            "**Panel de bagsstore** y este **Panel IT**."),
          h("Negocio y catálogos"),
          l(
            "**Travel Blue:** tienda minorista (WooCommerce), catálogo mayorista (PHP/MySQL), plataforma de venta en consignación para socios (piloto con Despegar) y marketing.",
            "**Cindy Preventa:** catálogo de preventas con control de stock. Primera carga real: valijas Lesedife (14 productos, 584 unidades), 27/10/2026.",
            "**Chimola:** sucursal minorista nueva, solo marca Chimola.",
            "**Reposición de Navidad 2026:** por grupo de artículos, con stock, foto, precio y recomendación de compra (ventana de comparación del 01/10/2025 al 15/01/2026).",
            "**Catálogo de merchandising para agencias de viajes:** imágenes cargadas, falta definir formato, orden y precios.",
            "**Inventario físico** del Bazar Carol y Tramontina: conteo cargado en Manager."),
          fuente("notas de proyectos y context/objetivos del vault · Verificado: 2026-11-03"),
        ],
      },
      {
        titulo: "Proyectos a futuro",
        etiquetas: ["proyectos"],
        bloques: [
          t("Lo que figura como objetivo o pendiente en el vault. Sin fechas comprometidas salvo las que se indican."),
          h("Infraestructura"),
          l(
            "**Reducir incidentes del servidor de producción:** RDP, sesiones colgadas, objetos GDI/User.",
            "**Limpieza de servidores y más memoria RAM** en el servidor de procesos.",
            "**Reemplazar la PC Compaq** del servidor de impresión: Windows 8.1 sin parches desde 2023 y sin camino a Windows 11.",
            "**Publicar el panel de la baja automática** (decidir dominio, nginx y certificado) y arreglar su validador.",
            "**Desplegar el Panel IT** (MongoDB Atlas + Cloudinary + VPS)."),
          h("Odoo y comercio electrónico"),
          l(
            "**Pase de la tienda a Tiendanube** (alrededor del 12/11/2026) y adaptar las herramientas que leen la tienda actual.",
            "**Decidir el canal de WhatsApp del CRM:** número nuevo, app de terceros, mantener Clientify con sincronización, o WhatsApp Web a secas.",
            "**Cotizar desde Odoo** (hoy se cotiza desde Manager): resolver antes las marcas `<li>` en los PDF de presupuesto.",
            "**Línea de WhatsApp con API oficial** para estampados y personalizados."),
          h("Herramientas y procesos"),
          l(
            "**Dashboard de ventas:** detalle de rubro por comprobante, sync incremental diaria, cron y pase a producción.",
            "**Profesionalizar procesos manuales:** fidelización Club Cindy, notificaciones por WhatsApp.",
            "**Consolidar el conocimiento** disperso en el vault.",
            "**Mejoras del panel de bagsstore:** indicador de salud y app instalable.",
            "**Travel Blue Socios** (consignación) más allá del piloto."),
          pendiente("las ideas y prioridades que no están escritas en ninguna nota."),
          fuente("context/objetivos y notas de proyectos del vault · Verificado: 2026-11-03"),
        ],
      },
    ],
  },

  // ===================================================================
  {
    titulo: "Kanban compartido (noticia para el equipo)",
    etiquetas: ["kanban", "noticia"],
    bloques: [
      pendiente("la idea de esta página no quedó del todo clara: la dejé armada como **borrador de la noticia** que presenta un tablero kanban compartido al equipo. Reemplazá el texto de ejemplo por el definitivo, o decime si lo que querías era otra cosa."),
      h("Lo que existe hoy"),
      l(
        "**Trello “MIS TAREAS”** (espacio CINDY): tablero maestro de las tareas laborales de Mauricio, con las listas **DIARIAS → POR HACER → EN CURSO → FINALIZADO**. No es compartido con el equipo.",
        "**Tazkeo** (`tareas.bagsstore.com.ar`): gestor de tareas del salón y el depósito, con asignaciones, tablero en tiempo real, tiempos y notificaciones por WhatsApp. Lo usa el personal de almacén.",
        "**Tareas diarias de rutina:** no mostrar en la web los códigos de “Códigos que no hay más”, contestar consultas por WhatsApp, códigos para dar de alta y corrección de stock (0/1)."),
      h("Borrador de la noticia"),
      av("**Nuevo: tablero compartido de tareas**\nA partir del [fecha] el equipo trabaja con un tablero kanban en [herramienta]. Cada tarea pasa por las columnas [columnas] y siempre tiene una persona responsable.", "naranja"),
      s("Qué cambia"),
      l("[Qué dejamos de hacer por WhatsApp o de palabra]", "[Qué se anota ahora en el tablero]"),
      s("Cómo se usa (3 pasos)"),
      tareas("[Paso 1: crear la tarjeta]", "[Paso 2: asignarla y ponerle fecha]", "[Paso 3: moverla de columna al avanzar]"),
      s("Reglas del tablero"),
      l("[Una persona responsable por tarjeta]", "[Qué significa cada columna]", "[Cuándo se archiva una tarjeta]"),
      s("A quién preguntar"),
      t("[Nombre y canal]"),
      pendiente("herramienta elegida (Tazkeo, Trello u otra), columnas, quiénes lo usan, desde cuándo y cómo se publica la noticia (en el panel de bagsstore, por WhatsApp o en una reunión)."),
      fuente("proyectos/trello-mis-tareas y gestor-tareas del vault · Verificado: 2026-11-03"),
    ],
  },
];

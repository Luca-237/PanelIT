// =====================================================================
//  Pendientes de tecnología de arranque, armados el 03/11/2026 con lo que
//  figura como pendiente en las notas del vault. "responsable" solo está
//  cuando una nota lo dice; si no, queda vacío para que lo asigne el equipo.
//  `equipo` es la descripción de un equipo y `pagina`, el título de una
//  página del panel (si no existen, se omite el vínculo). Se cargan con
//  `npm run cargar-pendientes`; no pisa los que ya existan (mismo título).
// =====================================================================
module.exports = [
  // ---- En curso
  { titulo: "Completar las páginas del panel con los avisos “A completar”", estado: "en_curso", prioridad: "media", responsable: "Luca",
    detalle: "Cada página cargada el 03/11 tiene avisos naranjas con lo que faltaba documentar.", pagina: "Configurar una PC nueva de Cindy" },

  // ---- Prioridad alta
  { titulo: "Confirmar la IP real de serverbags y de SERVER-SQL", estado: "pendiente", prioridad: "alta",
    detalle: "La nota del servidor dice que serverbags es 192.168.0.62, pero el router reserva esa IP a SERVER-SQL (y la .110 a “server”). Verificar con ipconfig en cada servidor y corregir notas y guía.", pagina: "Conexión al servidor y a las impresoras" },
  { titulo: "Destrabar el validador de la baja automática por WhatsApp", estado: "pendiente", prioridad: "alta", responsable: "Luca",
    detalle: "Al 27/10 había 112 códigos sin validar. Es el problema abierto n.º 1 del proyecto.", pagina: "Baja de artículos (sacar de la web)" },
  { titulo: "Cambiar la contraseña temporal del admin del Panel IT", estado: "pendiente", prioridad: "alta", responsable: "Luca",
    detalle: "Desde “Mi contraseña”, y borrar después el archivo datos-privados/admin-inicial.txt." },
  { titulo: "Probar la subida de una imagen real a Cloudinary desde una página", estado: "pendiente", prioridad: "alta", responsable: "Luca",
    detalle: "Arrastrar o pegar una imagen en una página del panel y comprobar que queda en Cloudinary y se ve." },

  // ---- Prioridad media
  { titulo: "Resolver los usuarios del servidor que usan dos equipos", estado: "pendiente", prioridad: "media",
    detalle: "DESKTOP-ABEFVBJ, DESKTOP-MJ621DQ, notebook2 y administracion2. Si dos equipos se conectan a la vez, uno le cierra la sesión al otro.", pagina: "Configurar una PC nueva de Cindy" },
  { titulo: "Revisar los puntos de venta de Manager repetidos", estado: "pendiente", prioridad: "media",
    detalle: "103: PC Caja Auxiliar y Notebook Lucas Oficina. 117: Juguetes CBA y Notebook CBA. Dos cajas con el mismo punto de venta pueden pisarse la numeración." },
  { titulo: "Cargar el acceso remoto de 3 equipos", estado: "pendiente", prioridad: "media",
    detalle: "PC Caja Auxiliar, PC Consultas Oficina y PC Lucia Devoluciones no tienen ID de AnyDesk ni de TeamViewer." },
  { titulo: "Definir cómo llegan al servidor las sucursales", estado: "pendiente", prioridad: "media",
    detalle: "Peatonal, Chimola, Córdoba y home office: ¿IP pública, VPN u otra cosa? Completar la guía de conexión.", pagina: "Conexión al servidor y a las impresoras" },
  { titulo: "Confirmar que la Compaq de la impresora ya no se duerme", estado: "pendiente", prioridad: "media",
    detalle: "Los comandos de energía (powercfg) se le pasaron a Mauricio pero no está confirmado que los haya ejecutado.", equipo: "Allinone consultas salon", pagina: "Impresora compartida HP LaserJet P1005 (Casa Central)" },
  { titulo: "Probar la impresora compartida desde las demás PCs", estado: "pendiente", prioridad: "media",
    detalle: "Hoy está probada solo desde la PC de Mauricio (Windows 11).", pagina: "Impresora compartida HP LaserJet P1005 (Casa Central)" },
  { titulo: "Control de llegada de mercadería: aplicar migraciones 9 y 10, push y subir a Ferozo", estado: "pendiente", prioridad: "media", responsable: "Luca",
    detalle: "Versión de caché 20261029.28." },
  { titulo: "Adaptar “Revisar en la web” al pase a Tiendanube", estado: "pendiente", prioridad: "media", responsable: "Luca",
    detalle: "Previsto para alrededor del 12/11/2026: cambia la página de búsqueda y hoy la tienda nueva pide contraseña de acceso.", pagina: "Buscar y cargar descripciones" },
  { titulo: "Publicar el panel de la baja automática", estado: "pendiente", prioridad: "media", responsable: "Luca",
    detalle: "Hoy escucha solo en 127.0.0.1:3010: falta decidir dominio, nginx y certificado.", pagina: "Baja de artículos (sacar de la web)" },
  { titulo: "Desplegar el Panel IT en un servidor", estado: "pendiente", prioridad: "media", responsable: "Luca",
    detalle: "Es una app Node: no corre en Ferozo. Propuesta: la VPS de DonWeb de Cindy con PM2 + nginx + HTTPS.", pagina: "Despliegue completo en Ferozo" },
  { titulo: "Proteger o borrar la planilla EQUIPOS CINDY.xlsx", estado: "pendiente", prioridad: "media", responsable: "Luca",
    detalle: "Tiene contraseñas en texto plano y ya está importada al panel, donde se guardan cifradas." },
  { titulo: "Resolver el reenvío del webmail de Ferozo a Gmail", estado: "pendiente", prioridad: "media",
    detalle: "Algunos mails no llegan ni a Spam y no hay rebote. Revisar SPF y DMARC.", pagina: "Despliegue completo en Ferozo" },

  // ---- Prioridad baja
  { titulo: "Regenerar las claves de Atlas y Cloudinary", estado: "pendiente", prioridad: "baja", responsable: "Luca",
    detalle: "Quedaron a la vista en el texto de una sesión de trabajo. Después actualizar el .env." },
  { titulo: "Completar el nombre de Windows de 3 equipos", estado: "pendiente", prioridad: "baja",
    detalle: "PC Caja Auxiliar, Tablet Mauricio y Notebook Nico." },
  { titulo: "Agregar DESKTOP-4SJ3FKK a la lista de usuarios del servidor", estado: "pendiente", prioridad: "baja",
    detalle: "Lo usa la Caja Guada pero no figura en la lista." },
  { titulo: "Revisar la carpeta compartida “softech” de la Compaq", estado: "pendiente", prioridad: "baja",
    detalle: "No se sabe si es intencional." },
  { titulo: "Reemplazar la PC Compaq del servidor de impresión", estado: "pendiente", prioridad: "baja",
    detalle: "Windows 8.1 sin parches desde 2023 y sin camino a Windows 11. Alternativas: Windows 10 de 64 bits o Linux con CUPS." },
  { titulo: "Revisar los proveedores duplicados en Compras", estado: "pendiente", prioridad: "baja", responsable: "Luca",
    detalle: "“CHARKO S.A.” y “Charko”." },
  { titulo: "Agregar el Panel IT y las herramientas nuevas al panel de bagsstore", estado: "pendiente", prioridad: "baja",
    detalle: "Panel IT, Rótulos, Gestor de RRHH, Control de llegada de mercadería y Dashboard de ventas.", pagina: "Funcionamiento del panel de bagsstore" },
  { titulo: "Definir el kanban compartido (noticia para el equipo)", estado: "pendiente", prioridad: "baja", responsable: "Luca",
    detalle: "Hay un borrador con huecos para completar.", pagina: "Kanban compartido (noticia para el equipo)" },

  // ---- Hechos
  { titulo: "Crear la base de datos del Panel IT en Atlas", estado: "hecho", prioridad: "alta", responsable: "Luca", detalle: "Colecciones con validación e índices." },
  { titulo: "Importar la planilla de equipos al panel", estado: "hecho", prioridad: "alta", responsable: "Luca", detalle: "31 equipos, 22 contraseñas cifradas y 36 usuarios del servidor." },
  { titulo: "Cargar las páginas iniciales del panel", estado: "hecho", prioridad: "media", responsable: "Luca", detalle: "8 temas, 17 páginas." },
];

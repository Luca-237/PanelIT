# Panel IT — Cindy Mayorista

Panel de control de sistemas: inventario de los equipos de la empresa, cómo se conectan al servidor (Manager2Max por Escritorio remoto) y notas de IT. Reemplaza la planilla `EQUIPOS CINDY.xlsx`.

## Secciones

| Sección | Qué tiene |
|---|---|
| **Tablero** | Equipos activos, cajas que facturan, servidores, usuarios del servidor libres. **Para revisar**: usuario del servidor usado por varios equipos, punto de venta de Manager repetido entre cajas, equipos sin usuario del servidor, sin acceso remoto o sin nombre de Windows, en reparación. Equipos por sucursal y páginas editadas hace poco. |
| **Equipos** | Tabla con búsqueda (también por ID de AnyDesk/TeamViewer) y filtros. Ficha con pestañas **Datos**, **Accesos** (IDs con botón copiar y, solo admin, contraseñas) y **Páginas** del equipo. Alta, edición, pasar a "De baja", CSV. |
| **Conexión al servidor** | Esquema (sucursales → Escritorio remoto → servidores) armado con los equipos cargados, acceso a la guía y usuarios del servidor con quién usa cada uno (libres, compartidos, mal escritos). |
| **Pendientes** | Lista corta y compartida de lo que falta hacer en tecnología: la ven todos los que entran al panel. Secciones **En curso** y **Para seguir** (ordenadas por prioridad) y **Hechos** (plegado). Cada uno tiene prioridad (alta, media, baja), responsable, y opcionalmente un equipo y una página con más información. Se tilda con la casilla, "Empezar" lo pasa a En curso, y arriba hay una línea para agregar rápido. Admin y técnico editan; consulta solo mira. El Tablero muestra los 5 que siguen y el menú, cuántos quedan. |
| **Páginas** (menú lateral) | Como Notion: árbol de páginas y subpáginas, y editor de bloques. Ver abajo. |
| **Usuarios del panel** (admin) | Alta, rol, activar/desactivar, contraseña nueva. |
| **Actividad** (admin) | Últimos 300 movimientos, incluido **quién mostró qué contraseña y cuándo**. |

### Páginas

- **Árbol** en el menú lateral: caret para desplegar, "+" en cada fila para agregar una subpágina. Se pueden **mover** a otra página (botón "Mover") y borrar (borra también sus subpáginas e imágenes).
- **Bloques**: texto, título, subtítulo, lista, lista de tareas (casillas), código, aviso (4 colores), imagen, separador y subpágina.
  - `/` en un bloque vacío abre el menú de tipos; el `+` de la izquierda agrega un bloque abajo.
  - Enter crea otro bloque; Backspace en uno vacío lo borra; el botón de seis puntos arrastra el bloque y abre sus opciones (duplicar, convertir, color, eliminar).
  - Formato dentro del texto: `**negrita**` y ``código``.
- **Guardado automático** a los ~1 s; arriba a la derecha dice "Guardando…" / "Guardado".
- **Imágenes**: se arrastran a la página, se pegan (Ctrl+V) o se suben desde el menú de bloques. Van a **Cloudinary** con subida firmada (el navegador sube directo; la API secret nunca sale del servidor). PNG, JPG, GIF o WebP, hasta 10 MB. Al sacar la imagen de la página (o borrar la página) se borra de Cloudinary.
- Una página puede estar atada a un **equipo** y tener etiquetas.
- La guía "Conexión con el servidor" se crea sola la primera vez con lo que se sabe (`server/guia-inicial.js`); lo marcado "A confirmar" hay que completarlo desde ahí.
- Pueden editar admin y técnico; consulta solo lee.

### Visual y tema

Líneas rectas (sin bordes redondeados), **negro puro** y **blanco tiza**, con el naranja de Cindy para acentos. Tipografías: **Noto Sans** para el texto y **Roboto Mono** para títulos, menús, datos y código. Tema oscuro por defecto; el botón "Tema" (abajo en el menú lateral) cambia a claro (fondo blanco tiza, texto negro) o a "según el sistema", y se recuerda por navegador. Los colores salen de variables al principio de `public/css/app.css`.

## Roles

- **admin**: todo, incluidas las contraseñas de los equipos y Actividad.
- **tecnico**: carga y edita equipos, usuarios del servidor y páginas. No ve contraseñas.
- **consulta**: solo mira. No ve contraseñas.

Siempre queda al menos un admin activo (el servidor no deja sacarlo).

## Seguridad

- **Contraseñas de equipos cifradas** con AES-256-GCM (`CLAVE_CIFRADO`, fuera de la base). En Atlas se ve un sobre cifrado, nunca el texto. El listado nunca las trae; para verlas hay que pedirlas una por una (`POST /api/credenciales/:id/revelar`), solo admin, y queda en Actividad. En pantalla se vuelven a ocultar a los 30 s y al cerrar la ficha.
- **Contraseñas de usuarios del panel** con scrypt (sal propia por usuario).
- **Sesión** en cookie `HttpOnly; SameSite=Strict` (+ `Secure` en producción), 12 h deslizantes; en la base se guarda solo el hash del token. Desactivar a alguien o cambiarle la contraseña le cierra las sesiones.
- **CSRF**: toda escritura exige la cabecera `X-Panel-IT: 1`.
- **Fuerza bruta**: 5 intentos fallidos por usuario + IP → 15 minutos bloqueado.
- **Cabeceras**: CSP sin scripts de terceros ni en línea, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, HSTS en producción.
- Imágenes: solo se aceptan URLs de la cuenta y carpeta de Cloudinary del panel; la CSP solo deja cargar imágenes de `res.cloudinary.com` y subir a `api.cloudinary.com`.
- El modo demo (`public/pruebas/`) no se sirve en producción.

## Estructura

```
server/            API Express + MongoDB
  index.js         arranque (lee .env)
  app.js           seguridad, sesión, rutas, página
  cripto.js        scrypt, AES-256-GCM, tokens
  db.js            conexión e índices
  guia-inicial.js  guía de conexión hasta que alguien la edite
  cloudinary.js    firma de subida y borrado de imágenes
  rutas/           auth, equipos, credenciales, usuarios-servidor, paginas, pendientes, usuarios, actividad
public/            la página (HTML/CSS/JS sin frameworks, mismo esquema que RRHH y Compras)
  js/api.js        única capa de datos (R.api)
  js/vistas/       una vista por sección + ficha + acceso; paginas.js = árbol y editor de bloques
  pruebas/         modo demo: datos inventados + API falsa
scripts/
  importar-planilla.js   EQUIPOS CINDY.xlsx → base
  crear-admin.js         primer admin
  dev-local.js           servidor local con MongoDB en memoria
pruebas/api.test.js      pruebas de la API (npm test)
```

### Colecciones de MongoDB

`equipos`, `credenciales` (cifradas, separadas de equipos), `usuarios_servidor`, `paginas` (cada una con su lista de bloques y `padreId`), `pendientes`, `meta`, `usuarios`, `sesiones` (TTL), `actividad`.

## Probar en la PC

```bash
npm install
npm test                 # 13 pruebas (API, páginas, imágenes, permisos, importación) contra un MongoDB en memoria
npm run dev              # http://localhost:3080 con datos inventados
```

Usuarios de `npm run dev`: `admin` / `admin-local-123`, `tecnico` / `tecnico-local-123`, `consulta` / `consulta-local-123` (solo existen en la base en memoria).
`npm run dev -- "C:\ruta\EQUIPOS CINDY.xlsx"` importa la planilla real en la base en memoria (se borra al cerrar).
Sin servidor: abrir la página con `?demo`, `?demo=tecnico` o `?demo=consulta` desde localhost.

La primera vez `npm test` baja MongoDB (~600 MB) a `node_modules/.cache`; después lo reutiliza.

## Importar la planilla

```bash
npm run importar -- "C:\ruta\EQUIPOS CINDY.xlsx" --simular
npm run importar -- "C:\ruta\EQUIPOS CINDY.xlsx"
```

- Sucursales normalizadas: Central, Peatonal, Córdoba, Chimola, Depósito P. Seppey, Home office.
- La contraseña de la columna "CONTRASEÑA" queda como TeamViewer si el equipo tiene ID de TeamViewer; si no, como "Otra".
- Filas sueltas (sin descripción o con un texto solo en la primera columna) no se importan y se informan.
- Volver a correrla **no pisa** lo editado en el panel: solo agrega equipos nuevos. Para pisar con la planilla: `--actualizar`.

## Cargar contenido y pendientes de arranque

```bash
npm run cargar-contenido -- --simular   # páginas de scripts/contenido-inicial.js
npm run cargar-contenido
npm run cargar-pendientes -- --simular  # pendientes de scripts/pendientes-iniciales.js
npm run cargar-pendientes
```

Ninguno pisa lo que ya existe (compara por título), así que se pueden repetir después de agregar más al archivo.

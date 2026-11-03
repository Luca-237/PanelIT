# Despliegue del Panel IT

El panel es una app **Node.js**, no PHP. En el hosting de Ferozo de Cindy (plan Emprendedor, donde corre todo lo demás) no se pudo confirmar que se pueda correr Node, así que la propuesta es la **VPS de DonWeb de Cindy** (la misma de Tazkeo y los sync). **Ferozo se usa solo para el DNS** del subdominio. *Antes de tocar la VPS, avisar a Mauricio.*

Si querés confirmar con DonWeb si Ferozo soporta Node, es una pregunta para su soporte; si dijeran que sí, las variables irían en el `.env` igual que abajo.

## Dónde van las variables de entorno

En un archivo **`.env` en la carpeta del proyecto, en el servidor** (`/home/<usuario>/panel-it/.env`), junto a `package.json`. El programa lo lee solo al arrancar (`server/config.js`).

- **No va** en `public_html`, ni en git (`.gitignore` ya lo excluye), ni en el vault, ni en el chat.
- Permisos: `chmod 600 .env` (solo el usuario que corre el panel).
- Cada cambio en `.env` pide reiniciar: `pm2 restart panel-it`.

Contenido (plantilla en `.env.ejemplo`):

| Variable | Qué poner |
|---|---|
| `MONGODB_URI` | La cadena de conexión de Atlas. Usar un usuario de base con permiso solo sobre `panel_it`. |
| `MONGODB_BASE` | `panel_it` |
| `CLAVE_CIFRADO` | **La misma que usás hoy en tu PC**, si el servidor usa la misma base de Atlas. Con otra clave, las contraseñas de equipos ya guardadas **no se pueden descifrar**. Guardar una copia en el gestor de contraseñas. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Los de la cuenta de Cloudinary. Opcional: sin ellos todo anda menos subir imágenes. |
| `CLOUDINARY_CARPETA` | `panel-it` |
| `PUERTO` | `3080` (nginx le habla a este puerto, solo por dentro) |
| `NODE_ENV` | **`production`** en el servidor (la cookie de sesión pasa a ser solo HTTPS). En tu PC, `development`. |
| `HORAS_SESION` | `12` |

Para crear el archivo sin escribir las claves en el historial de la terminal: `nano .env`, pegar y guardar.

## Pasos

### 1. Atlas
Network Access → agregar la **IP pública de la VPS** (no `0.0.0.0/0`). Comprobar que el usuario de base tenga `readWrite` solo sobre `panel_it`.

### 2. DNS en Ferozo
En el panel de Ferozo → Dominios → `bagsstore.com.ar` → zona DNS: agregar un registro **A** `it` → IP de la VPS. (Si la zona DNS estuviera en otro lado, es el mismo registro en ese lugar.) Esperar la propagación (minutos a un par de horas).

### 3. En la VPS (una sola vez)
Verificar primero qué hay: `node -v` (hace falta **Node 20.12 o más; recomendado 22 LTS**), `pm2 -v`, `nginx -v`. Si falta algo, instalarlo (Node vía NodeSource o nvm, `npm i -g pm2`, `apt install nginx certbot python3-certbot-nginx` si es Debian/Ubuntu: confirmar el sistema con `cat /etc/os-release`).

```bash
git clone https://github.com/<usuario>/<repo-privado>.git panel-it
cd panel-it
npm ci --omit=dev
nano .env                     # ver la tabla de arriba
chmod 600 .env
```

Si el repositorio es **privado**, `git clone` por HTTPS pide un token de GitHub *fine-grained*, solo ese repositorio, permiso **Contents: Read-only**. No dejarlo escrito en ningún archivo del proyecto.

### 4. Primer arranque
```bash
node scripts/preparar-base.js        # crea colecciones e índices (no toca datos)
npm run crear-admin -- <usuario> "<Nombre>"   # solo si la base de ese servidor es nueva
pm2 start ecosystem.config.js
pm2 save && pm2 startup              # para que arranque solo después de un reinicio (ejecutar el comando que muestra)
curl -s http://127.0.0.1:3080/api/auth/yo      # debe responder {"error":"Falta iniciar sesión"}
```
**Si usan la misma base de Atlas que en tu PC, no hace falta crear admin ni importar nada**: ya están. Con la misma base, además, cualquier cambio que hagas desde tu PC aparece en el servidor y al revés.

### 5. nginx y HTTPS
```bash
sudo cp deploy/nginx-panel-it.conf /etc/nginx/sites-available/panel-it   # cambiar el dominio dentro
sudo ln -s /etc/nginx/sites-available/panel-it /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d it.bagsstore.com.ar
```
Si en la VPS ya hay nginx con otros sitios, **no tocar sus archivos**: solo agregar este.

### 6. Verificar desde afuera
- `https://it.bagsstore.com.ar` carga el login y no da error de certificado.
- Entrar y ver los equipos, abrir una página, subir una imagen (prueba real de Cloudinary).
- En Actividad aparece el ingreso con **tu IP** (no `127.0.0.1`): confirma que nginx pasa bien `X-Forwarded-For`.
- `curl -I https://it.bagsstore.com.ar/.env` y `/package.json` deben dar **404** (el servidor solo sirve la carpeta `public/`).

## Actualizar
```bash
cd ~/panel-it && git pull && npm ci --omit=dev && pm2 restart panel-it
pm2 logs panel-it --lines 50     # mirar que no haya errores
```
Si cambió la estructura de la base: `node scripts/preparar-base.js` (también se aplica solo al arrancar). Para volver atrás: `git revert <commit>` y lo mismo.

## Riesgos
- **Perder `CLAVE_CIFRADO` = perder las contraseñas guardadas.**
- **No usar dos servidores a la vez** ni más de una instancia de PM2: el bloqueo de intentos de login está en la memoria de cada proceso.
- La planilla `EQUIPOS CINDY.xlsx` tiene contraseñas en texto plano: no subirla a la VPS; ya está importada.
- Las claves de Atlas y Cloudinary quedaron visibles en una sesión de trabajo: regenerarlas antes o justo después de desplegar (y actualizar `.env` en los dos lados).
- El `.env` de tu PC y el del servidor son **archivos distintos**: cambiar uno no cambia el otro.

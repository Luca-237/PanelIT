// Configuración de PM2 para el servidor (VPS). NO lleva claves: esas van en el archivo
// .env de la carpeta del proyecto, que lee el propio programa al arrancar.
//   pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [{
    name: "panel-it",
    script: "server/index.js",
    cwd: __dirname,
    instances: 1,                 // una sola: el bloqueo de intentos de login vive en memoria
    exec_mode: "fork",
    max_memory_restart: "300M",
    env: { NODE_ENV: "production" },
  }],
};

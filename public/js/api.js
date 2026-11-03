// =====================================================================
//  Única capa de datos de la página: habla con la API del servidor
//  (/api/...). En modo demo, pruebas/api-falsa.js reemplaza R.api por
//  una base en memoria con la misma forma.
// =====================================================================
(function (R) {
  const oyentes = [];
  const avisarSalida = () => oyentes.forEach(f => f("SIGNED_OUT"));

  async function pedir(metodo, ruta, cuerpo) {
    let r;
    try {
      r = await fetch("api" + ruta, {
        method: metodo,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Panel-IT": "1" },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
    } catch (e) { throw new Error("No hay conexión con el servidor del panel"); }
    let datos = null;
    try { datos = await r.json(); } catch (e) { /* sin cuerpo */ }
    // Sesión vencida o cerrada desde otro lado: volver al login
    if (r.status === 401 && ruta !== "/auth/ingresar" && ruta !== "/auth/yo") avisarSalida();
    if (!r.ok) {
      const err = new Error((datos && datos.error) || `Error ${r.status}`);
      err.estado = r.status;
      throw err;
    }
    return datos;
  }
  const get = ruta => pedir("GET", ruta);
  const post = (ruta, c = {}) => pedir("POST", ruta, c);
  const put = (ruta, c = {}) => pedir("PUT", ruta, c);
  const del = ruta => pedir("DELETE", ruta);
  const id = encodeURIComponent;

  R.api = {
    auth: {
      ingresar: (usuario, password) => post("/auth/ingresar", { usuario, password }),
      salir: () => post("/auth/salir").catch(() => null),
      // Perfil si hay sesión; null si no
      yo: () => get("/auth/yo").catch(e => { if (e.estado === 401) return null; throw e; }),
      cambiarPassword: (actual, nueva) => post("/auth/cambiar-password", { actual, nueva }),
      alCambiar: f => oyentes.push(f),
    },
    equipos: {
      listar: () => get("/equipos"),
      crear: d => post("/equipos", d),
      editar: (eid, d) => put(`/equipos/${id(eid)}`, d),
      borrar: eid => del(`/equipos/${id(eid)}`),
    },
    credenciales: {
      listar: equipoId => get(`/equipos/${id(equipoId)}/credenciales`),
      crear: (equipoId, d) => post(`/equipos/${id(equipoId)}/credenciales`, d),
      editar: (cid, d) => put(`/credenciales/${id(cid)}`, d),
      borrar: cid => del(`/credenciales/${id(cid)}`),
      revelar: cid => post(`/credenciales/${id(cid)}/revelar`).then(r => r.valor),
    },
    usuariosServidor: {
      listar: () => get("/usuarios-servidor"),
      crear: d => post("/usuarios-servidor", d),
      editar: (uid, d) => put(`/usuarios-servidor/${id(uid)}`, d),
      borrar: uid => del(`/usuarios-servidor/${id(uid)}`),
    },
    paginas: {
      // { paginas: [resumen…], guiaId }  (sin el contenido de los bloques)
      listar: () => get("/paginas"),
      obtener: pid => get(`/paginas/${id(pid)}`),
      crear: d => post("/paginas", d),
      editar: (pid, d) => put(`/paginas/${id(pid)}`, d),
      borrar: pid => del(`/paginas/${id(pid)}`),
    },
    imagenes: {
      estado: () => get("/imagenes/estado").then(r => r.activo),
      // Sube a Cloudinary con una firma del servidor; devuelve { url, publicId, ancho, alto }
      async subir(archivo) {
        const f = await post("/imagenes/firma");
        const datos = new FormData();
        ["allowed_formats", "folder", "timestamp", "signature"].forEach(k => datos.append(k, f[k]));
        datos.append("api_key", f.apiKey);
        datos.append("file", archivo);
        let r;
        try { r = await fetch(f.url, { method: "POST", body: datos }); }
        catch (e) { throw new Error("No se pudo subir la imagen: sin conexión con Cloudinary"); }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error("Cloudinary rechazó la imagen" + (j.error && j.error.message ? ": " + j.error.message : ""));
        return { url: j.secure_url, publicId: j.public_id, ancho: j.width, alto: j.height };
      },
    },
    pendientes: {
      listar: () => get("/pendientes"),
      crear: d => post("/pendientes", d),
      editar: (pid, d) => put(`/pendientes/${id(pid)}`, d),
      borrar: pid => del(`/pendientes/${id(pid)}`),
    },
    usuarios: {
      listar: () => get("/usuarios"),
      crear: d => post("/usuarios", d),
      editar: (uid, d) => put(`/usuarios/${id(uid)}`, d),
    },
    actividad: { listar: () => get("/actividad") },
  };
})(window.PANELIT);

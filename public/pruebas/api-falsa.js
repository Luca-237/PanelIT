// =====================================================================
//  Modo demo (?demo, ?demo=tecnico, ?demo=consulta): reemplaza R.api por
//  una base en memoria con los datos INVENTADOS de datos-demo.js.
//  Imita los permisos del servidor para poder probar cada rol.
//  Solo se carga en localhost y el servidor no la sirve en producción.
// =====================================================================
(function (R) {
  const D = window.PANELIT_DEMO;
  const rol = (new URLSearchParams(location.search).get("demo") || "admin").replace(/[^a-z]/g, "") || "admin";
  let n = 0;
  const nid = () => (++n).toString(16).padStart(24, "0");
  const ahora = () => new Date().toISOString();
  const copia = x => JSON.parse(JSON.stringify(x));
  const espera = (x, ms = 120) => new Promise(ok => setTimeout(() => ok(copia(x)), ms));
  const falla = msg => Promise.reject(new Error(msg));

  const yo = { id: nid(), usuario: rol, nombre: { admin: "Admin demo", tecnico: "Técnico demo", consulta: "Consulta demo" }[rol] || "Demo", rol, activo: true };
  const usuarios = [yo, { id: nid(), usuario: "otro", nombre: "Otra persona", rol: "consulta", activo: true }];
  const equipos = [], credenciales = [], actividad = [];
  D.equipos.forEach(({ clave, ...e }) => {
    const eq = { id: nid(), ...copia(e), creado: ahora(), actualizado: ahora(), actualizadoPor: "Datos de prueba" };
    equipos.push(eq);
    if (clave) credenciales.push({ id: nid(), equipoId: eq.id, tipo: e.teamviewerId ? "teamviewer" : "otra", usuario: "", valor: clave, actualizado: ahora(), actualizadoPor: "Datos de prueba" });
  });
  const usuariosServidor = D.usuariosServidor.map(nombre => ({ id: nid(), nombre, notas: "" }));
  const nuevoBloqueId = () => Math.random().toString(36).slice(2, 10);
  const paginas = [];
  D.paginas.forEach((p, orden) => paginas.push({ id: nid(), titulo: p.titulo, padreId: null, orden, bloques: [], etiquetas: p.etiquetas || [], fijada: !!p.fijada,
    equipoId: (equipos.find(e => e.descripcion === p.equipo) || {}).id || null, creado: ahora(), actualizado: ahora(), actualizadoPor: "Datos de prueba" }));
  D.paginas.forEach(p => {
    const pg = paginas.find(x => x.titulo === p.titulo);
    pg.padreId = p.padre ? paginas.find(x => x.titulo === p.padre).id : null;
    pg.bloques = p.bloques.map(({ pagina, ...b }) => ({ id: nuevoBloqueId(), ...b, ...(pagina ? { paginaId: paginas.find(x => x.titulo === pagina).id } : {}) }));
  });
  const guiaPag = { id: nid(), titulo: "Conexión con el servidor", padreId: null, orden: -1, etiquetas: ["servidor"], fijada: true, equipoId: null, creado: ahora(), actualizado: ahora(), actualizadoPor: "Guía inicial",
    bloques: [{ id: nuevoBloqueId(), tipo: "titulo", texto: "Cómo funciona" }, { id: nuevoBloqueId(), tipo: "texto", texto: "Manager corre en el servidor. Cada equipo entra por **Escritorio remoto (RDP)** con su usuario del servidor." },
      { id: nuevoBloqueId(), tipo: "lista", texto: "Dos equipos no deberían usar el mismo usuario a la vez.\nLas cajas tienen su punto de venta propio." }, { id: nuevoBloqueId(), tipo: "codigo", texto: "mstsc" }] };
  paginas.unshift(guiaPag);
  const resumenP = p => { const { bloques, ...r } = p; return r; };

  const pendientes = (D.pendientes || []).map(p => ({ id: nid(), titulo: p.titulo, detalle: p.detalle || "", estado: p.estado, prioridad: p.prioridad, responsable: p.responsable || "",
    equipoId: (equipos.find(e => e.descripcion === p.equipo) || {}).id || null, paginaId: (paginas.find(x => x.titulo === p.pagina) || {}).id || null,
    creado: ahora(), actualizado: ahora(), actualizadoPor: "Datos de prueba", hechoEn: p.estado === "hecho" ? ahora() : null }));
  const puedeEditar = () => rol === "admin" || rol === "tecnico";
  const sinPermiso = () => falla("No tenés permiso para esto");
  const reg = (accion, detalle = "") => actividad.unshift({ id: nid(), fecha: ahora(), usuario: yo.usuario, accion, detalle });
  const conConteo = e => ({ ...e, credenciales: credenciales.filter(c => c.equipoId === e.id).length });
  const resumenCred = c => ({ id: c.id, equipoId: c.equipoId, tipo: c.tipo, usuario: c.usuario, actualizado: c.actualizado, actualizadoPor: c.actualizadoPor });
  const notaPublica = x => ({ ...x, autorId: undefined, propia: x.autorId === yo.id });
  let sesion = false;

  R.api = {
    auth: {
      ingresar: () => { sesion = true; reg("ingreso"); return espera(yo); },
      salir: () => { sesion = false; return espera({ ok: true }); },
      yo: () => espera(sesion ? yo : null),
      cambiarPassword: () => espera({ ok: true }),
      alCambiar: () => {},
    },
    equipos: {
      listar: () => espera(equipos.map(conConteo)),
      crear: d => {
        if (!puedeEditar()) return sinPermiso();
        if (!d.descripcion) return falla("Falta la descripción");
        const e = { id: nid(), ...d, creado: ahora(), actualizado: ahora(), actualizadoPor: yo.nombre };
        equipos.push(e); reg("alta de equipo", e.descripcion);
        return espera(conConteo(e));
      },
      editar: (id, d) => {
        if (!puedeEditar()) return sinPermiso();
        const e = equipos.find(x => x.id === id);
        if (!e) return falla("Ese equipo ya no existe");
        const { id: _i, credenciales: _c, ...datos } = d;
        Object.assign(e, datos, { actualizado: ahora(), actualizadoPor: yo.nombre });
        reg("edición de equipo", e.descripcion);
        return espera(conConteo(e));
      },
      borrar: id => {
        if (rol !== "admin") return sinPermiso();
        const i = equipos.findIndex(x => x.id === id);
        reg("borrado de equipo", equipos[i].descripcion);
        equipos.splice(i, 1);
        for (let j = credenciales.length - 1; j >= 0; j--) if (credenciales[j].equipoId === id) credenciales.splice(j, 1);
        paginas.forEach(x => { if (x.equipoId === id) x.equipoId = null; });
        return espera({ ok: true });
      },
    },
    credenciales: {
      listar: equipoId => rol !== "admin" ? sinPermiso() : espera(credenciales.filter(c => c.equipoId === equipoId).map(resumenCred)),
      crear: (equipoId, d) => {
        if (rol !== "admin") return sinPermiso();
        const c = { id: nid(), equipoId, tipo: d.tipo, usuario: d.usuario, valor: d.valor, actualizado: ahora(), actualizadoPor: yo.nombre };
        credenciales.push(c); reg("contraseña cargada");
        return espera(resumenCred(c));
      },
      editar: (id, d) => {
        if (rol !== "admin") return sinPermiso();
        const c = credenciales.find(x => x.id === id);
        Object.assign(c, { tipo: d.tipo, usuario: d.usuario, actualizado: ahora(), actualizadoPor: yo.nombre }, d.valor ? { valor: d.valor } : {});
        reg("contraseña editada");
        return espera(resumenCred(c));
      },
      borrar: id => { if (rol !== "admin") return sinPermiso(); credenciales.splice(credenciales.findIndex(x => x.id === id), 1); reg("contraseña borrada"); return espera({ ok: true }); },
      revelar: id => {
        if (rol !== "admin") return sinPermiso();
        const c = credenciales.find(x => x.id === id);
        const e = equipos.find(x => x.id === c.equipoId);
        reg("contraseña mostrada", `${c.tipo} · ${e ? e.descripcion : "?"}`);
        return espera(c.valor);
      },
    },
    usuariosServidor: {
      listar: () => espera([...usuariosServidor].sort((a, b) => a.nombre.localeCompare(b.nombre))),
      crear: d => {
        if (!puedeEditar()) return sinPermiso();
        if (usuariosServidor.some(u => u.nombre.toLowerCase() === d.nombre.toLowerCase())) return falla("Ya existe uno con ese nombre");
        const u = { id: nid(), nombre: d.nombre, notas: d.notas || "" };
        usuariosServidor.push(u); return espera(u);
      },
      editar: (id, d) => { if (!puedeEditar()) return sinPermiso(); const u = usuariosServidor.find(x => x.id === id); Object.assign(u, { nombre: d.nombre, notas: d.notas || "" }); return espera(u); },
      borrar: id => { if (!puedeEditar()) return sinPermiso(); usuariosServidor.splice(usuariosServidor.findIndex(x => x.id === id), 1); return espera({ ok: true }); },
    },
    paginas: {
      listar: () => espera({ paginas: paginas.map(resumenP), guiaId: guiaPag.id }),
      obtener: id => { const p = paginas.find(x => x.id === id); return p ? espera(p) : falla("Esa página ya no existe"); },
      crear: d => {
        if (!puedeEditar()) return sinPermiso();
        const p = { id: nid(), titulo: d.titulo || "", padreId: d.padreId || null, orden: paginas.length, bloques: [], etiquetas: [], fijada: false, equipoId: d.equipoId || null, creado: ahora(), actualizado: ahora(), actualizadoPor: yo.nombre };
        paginas.push(p); reg("página nueva", p.titulo); return espera(p);
      },
      editar: (id, d) => {
        if (!puedeEditar()) return sinPermiso();
        const p = paginas.find(x => x.id === id);
        if (!p) return falla("Esa página ya no existe");
        const sub = i => [i, ...paginas.filter(x => x.padreId === i).flatMap(x => sub(x.id))];
        if (d.padreId && sub(id).includes(d.padreId)) return falla("No se puede mover una página adentro de sí misma");
        Object.assign(p, d, { actualizado: ahora(), actualizadoPor: yo.nombre });
        return espera(p);
      },
      borrar: id => {
        if (!puedeEditar()) return sinPermiso();
        const sub = i => [i, ...paginas.filter(x => x.padreId === i).flatMap(x => sub(x.id))];
        const ids = sub(id); ids.forEach(i => paginas.splice(paginas.findIndex(x => x.id === i), 1));
        reg("página borrada"); return espera({ ok: true, borradas: ids.length });
      },
    },
    imagenes: {
      estado: () => espera(true),
      // En demo no se sube a ningún lado: la imagen queda en la página como dato local
      subir: archivo => new Promise((ok, mal) => {
        const r = new FileReader();
        r.onload = () => ok({ url: r.result, publicId: "demo/" + nid(), ancho: null, alto: null });
        r.onerror = () => mal(new Error("No se pudo leer la imagen"));
        r.readAsDataURL(archivo);
      }),
    },
    pendientes: {
      listar: () => espera(pendientes),
      crear: d => {
        if (!puedeEditar()) return sinPermiso();
        if (!d.titulo) return falla("Falta el título");
        const p = { id: nid(), detalle: "", responsable: "", equipoId: null, paginaId: null, ...d, creado: ahora(), actualizado: ahora(), actualizadoPor: yo.nombre, hechoEn: d.estado === "hecho" ? ahora() : null };
        pendientes.push(p); reg("pendiente nuevo", p.titulo); return espera(p);
      },
      editar: (id, d) => {
        if (!puedeEditar()) return sinPermiso();
        const p = pendientes.find(x => x.id === id);
        if (!p) return falla("Ese pendiente ya no existe");
        const antes = p.estado;
        Object.assign(p, d, { id, actualizado: ahora(), actualizadoPor: yo.nombre, hechoEn: d.estado === "hecho" ? (p.hechoEn || ahora()) : null });
        reg(antes !== p.estado ? "pendiente → " + p.estado : "pendiente editado", p.titulo); return espera(p);
      },
      borrar: id => { if (!puedeEditar()) return sinPermiso(); const i = pendientes.findIndex(x => x.id === id); reg("pendiente borrado", pendientes[i].titulo); pendientes.splice(i, 1); return espera({ ok: true }); },
    },
    usuarios: {
      listar: () => rol !== "admin" ? sinPermiso() : espera(usuarios),
      crear: d => {
        if (!d.password || d.password.length < 10) return falla("La contraseña tiene que tener al menos 10 caracteres");
        if (usuarios.some(u => u.usuario === d.usuario)) return falla("Ya existe uno con ese nombre");
        const u = { id: nid(), usuario: d.usuario, nombre: d.nombre, rol: d.rol, activo: true };
        usuarios.push(u); return espera(u);
      },
      editar: (id, d) => {
        const u = usuarios.find(x => x.id === id);
        if (u.rol === "admin" && (d.rol !== "admin" || d.activo === false) && !usuarios.some(x => x.id !== id && x.rol === "admin" && x.activo)) return falla("Tiene que quedar al menos un admin activo");
        Object.assign(u, { nombre: d.nombre, rol: d.rol, activo: d.activo !== false }); return espera(u);
      },
    },
    actividad: { listar: () => rol !== "admin" ? sinPermiso() : espera(actividad) },
  };
  // En demo se entra sin escribir contraseña
  sesion = true;
})(window.PANELIT);

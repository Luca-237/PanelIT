// =====================================================================
//  Páginas estilo Notion: árbol en el menú lateral y editor de bloques.
//  Bloques: texto, título, subtítulo, lista, tareas, código, aviso,
//  imagen (Cloudinary), separador y subpágina. Se guardan solas.
//    - "/" en un bloque vacío abre el menú de bloques; "+" agrega abajo
//    - Enter crea otro bloque; Backspace en uno vacío lo borra
//    - el botón de seis puntos arrastra el bloque y abre su menú
//    - se pueden arrastrar o pegar imágenes en la página
// =====================================================================
(function (R) {
  const { $, esc, toast, confirmar, textoRico, enLinea, ICONOS, menu } = R.util;

  const TIPOS = [
    { tipo: "texto", nombre: "Texto", desc: "Un párrafo normal", ico: "texto" },
    { tipo: "titulo", nombre: "Título", desc: "Título grande", ico: "titulo" },
    { tipo: "subtitulo", nombre: "Subtítulo", desc: "Título mediano", ico: "subtitulo" },
    { tipo: "lista", nombre: "Lista", desc: "Un ítem por línea", ico: "lista" },
    { tipo: "tareas", nombre: "Lista de tareas", desc: "Con casillas para tildar", ico: "tareas" },
    { tipo: "codigo", nombre: "Código", desc: "Comandos, rutas, configuraciones", ico: "codigo" },
    { tipo: "aviso", nombre: "Aviso", desc: "Recuadro para destacar algo", ico: "aviso" },
    { tipo: "imagen", nombre: "Imagen", desc: "Se sube a Cloudinary", ico: "imagen" },
    { tipo: "subpagina", nombre: "Subpágina", desc: "Una página dentro de esta", ico: "doc" },
    { tipo: "separador", nombre: "Separador", desc: "Una línea divisoria", ico: "separador" },
  ];
  const DE_TEXTO = ["texto", "titulo", "subtitulo", "lista", "codigo", "aviso"];
  const COLORES_AVISO = [["naranja", "Naranja"], ["gris", "Gris"], ["rojo", "Rojo"], ["verde", "Verde"]];
  const MAX_MB = 10;

  let abiertas = new Set();      // páginas del árbol desplegadas
  try { abiertas = new Set(JSON.parse(localStorage.getItem("panelit.arbol") || "[]")); } catch (e) {}
  let actualId = null;           // página abierta
  let p = null;                  // la página completa
  let bloques = [];              // sus bloques (con ids)
  let puede = false;
  let editando = null;           // índice del bloque de texto en edición
  let ultimo = -1;               // último bloque tocado (para insertar imágenes)
  let sucio = false, timer = null, arrastrando = null;
  let cargaId = 0;

  const nuevoId = () => Math.random().toString(36).slice(2, 10);
  const lista = () => R.estado.paginas;
  const porId = id => lista().find(x => x.id === id);
  const hijos = id => lista().filter(x => x.padreId === id).sort((a, b) => (a.orden - b.orden) || String(a.creado).localeCompare(String(b.creado)));
  const ancestros = id => { const out = []; let x = porId(id); while (x && x.padreId) { x = porId(x.padreId); if (x) out.unshift(x); } return out; };
  const descendientes = id => { const out = []; hijos(id).forEach(h => { out.push(h.id, ...descendientes(h.id)); }); return out; };
  const nombre = x => (x && x.titulo) || "Sin título";
  const estadoGuardado = t => { $("estado-guardado").textContent = t; };

  // ---------- Árbol del menú lateral ----------
  function filas(padreId) {
    return hijos(padreId).map(h => {
      const hh = hijos(h.id).length, ab = abiertas.has(h.id) && hh;
      return `<li><div class="arbol-fila${h.id === actualId ? " activo" : ""}" data-id="${esc(h.id)}" role="treeitem">
        <button type="button" class="caret${ab ? " abierto" : ""}${hh ? "" : " sin-hijas"}" data-caret aria-label="Mostrar subpáginas" tabindex="-1">${ICONOS.derecha}</button>
        <span class="doc">${ICONOS.doc}</span><span class="nombre${h.titulo ? "" : " sin"}">${esc(nombre(h))}</span>
        ${R.app.puedeEditar() ? `<button type="button" class="btn-ico" data-nueva title="Agregar una subpágina">${ICONOS.mas}</button>` : ""}
      </div>${ab ? `<ul class="arbol">${filas(h.id)}</ul>` : ""}</li>`;
    }).join("");
  }
  function pintarArbol() {
    const raiz = hijos(null);
    $("arbol").innerHTML = raiz.length ? filas(null) : "";
    $("arbol-pie").innerHTML = raiz.length ? "" : `<div class="arbol-vacio">Todavía no hay páginas.</div>`;
  }
  function expandirHasta(id) {
    ancestros(id).forEach(a => abiertas.add(a.id));
    guardarAbiertas();
  }
  function guardarAbiertas() { try { localStorage.setItem("panelit.arbol", JSON.stringify([...abiertas])); } catch (e) {} }

  // ---------- Ubicación (barra superior) ----------
  function pintarRuta() {
    const partes = [`<a href="#pagina">Páginas</a>`];
    if (p) [...ancestros(p.id), porId(p.id) || p].forEach((x, i, a) => partes.push(i === a.length - 1 ? `<span>${esc(nombre(x))}</span>` : `<a href="#pagina/${esc(x.id)}">${esc(nombre(x))}</a>`));
    R.app.ruta(partes.join(`<span class="sep">/</span>`), true);
  }

  // ---------- Crear, mover y borrar ----------
  const resumen = x => { const { bloques: _b, ...r } = x; return r; };
  async function crear(padreId, extra = {}) {
    try {
      const n = await R.api.paginas.crear({ titulo: "", padreId: padreId || null, ...extra });
      R.estado.paginas.push(resumen(n));
      if (padreId) { abiertas.add(padreId); guardarAbiertas(); }
      location.hash = "#pagina/" + n.id;
      return n;
    } catch (e) { toast(e.message, "error", 5000); return null; }
  }

  async function mover() {
    const excluidas = new Set([p.id, ...descendientes(p.id)]);
    const camino = id => [...ancestros(id), porId(id)].map(nombre).join(" / ");
    const opciones = lista().filter(x => !excluidas.has(x.id)).sort((a, b) => camino(a.id).localeCompare(camino(b.id)))
      .map(x => ({ valor: x.id, texto: camino(x.id), ico: "doc", elegido: x.id === p.padreId }));
    const v = await menu($("pag-mover"), [{ titulo: "Mover a…" }, { valor: "__raiz", texto: "Primer nivel (sin página de arriba)", ico: "doc", elegido: !p.padreId }, ...opciones]);
    if (!v) return;
    await guardar();
    try {
      const nuevo = v === "__raiz" ? null : v;
      await R.api.paginas.editar(p.id, { padreId: nuevo });
      porId(p.id).padreId = nuevo; p.padreId = nuevo;
      expandirHasta(p.id); pintarArbol(); pintarRuta();
      toast("Página movida");
    } catch (e) { toast(e.message, "error", 5000); }
  }

  async function borrar() {
    const n = descendientes(p.id).length;
    const texto = `Se borra "${nombre(p)}"${n ? ` y sus ${n} subpágina(s)` : ""}, con las imágenes que tengan. No se puede deshacer.`;
    if (!await confirmar(texto, { titulo: "Borrar página", aceptar: "Borrar", peligro: true })) return;
    try {
      const ids = new Set([p.id, ...descendientes(p.id)]);
      clearTimeout(timer); sucio = false;
      await R.api.paginas.borrar(p.id);
      R.estado.paginas = lista().filter(x => !ids.has(x.id));
      p = null; actualId = null;
      toast("Página borrada");
      location.hash = "#pagina";
    } catch (e) { toast(e.message, "error", 5000); }
  }

  // ---------- Guardado automático ----------
  function programar() {
    if (!puede) return;
    sucio = true; estadoGuardado("Sin guardar…");
    clearTimeout(timer); timer = setTimeout(guardar, 900);
  }
  async function guardar() {
    clearTimeout(timer);
    if (!sucio || !p) return;
    const id = p.id;
    const datos = {
      titulo: p.titulo, etiquetas: p.etiquetas, equipoId: p.equipoId || null,
      bloques: bloques.filter(b => !b._subiendo).map(b => { const { _subiendo, ...x } = b; return x; }),
    };
    sucio = false; estadoGuardado("Guardando…");
    try {
      const r = await R.api.paginas.editar(id, datos);
      const res = porId(id);
      if (res) Object.assign(res, resumen(r));
      if (p && p.id === id) { p.actualizado = r.actualizado; p.actualizadoPor = r.actualizadoPor; pintarMeta(); }
      pintarArbol(); pintarRuta();
      estadoGuardado("Guardado");
    } catch (e) { sucio = true; estadoGuardado("No se pudo guardar"); toast(e.message, "error", 6000); }
  }

  // ---------- Pantalla de índice (sin página elegida) ----------
  function mostrarIndice() {
    actualId = null; p = null; puede = R.app.puedeEditar();
    R.app.ruta(`<span>Páginas</span>`);
    pintarArbol(); estadoGuardado("");
    const raiz = hijos(null);
    $("vista-pagina").innerHTML = `<div class="vista-head"><div><h1>Páginas</h1><p class="sub">Guías, procedimientos y notas de sistemas. Cada página puede tener subpáginas e imágenes.</p></div>
      <div class="controles">${puede ? `<button class="btn-sec primario" id="indice-nueva" type="button">${ICONOS.mas}Nueva página</button>` : ""}</div></div>
      <div class="lista-paginas">${raiz.map(x => { const n = descendientes(x.id).length; const eq = x.equipoId && R.app.equipo(x.equipoId);
        return `<a class="tarjeta-pagina" href="#pagina/${esc(x.id)}">${ICONOS.doc}<span><strong>${esc(nombre(x))}</strong><small>${n ? `${n} subpágina(s) · ` : ""}${eq ? esc(eq.descripcion) + " · " : ""}${R.util.fmtFecha(x.actualizado)}</small></span></a>`; }).join("")
        || `<p class="vacio">Todavía no hay páginas.</p>`}</div>`;
    const b = $("indice-nueva"); if (b) b.addEventListener("click", () => crear(null));
  }

  // ---------- Editor ----------
  const iconoTipo = t => (TIPOS.find(x => x.tipo === t) || {}).ico;

  function htmlBloque(b, i) {
    const manijas = puede ? `<div class="bloque-manijas"><button type="button" class="btn-ico" data-acc="mas" title="Agregar un bloque abajo">${ICONOS.mas}</button><button type="button" class="btn-ico agarre" draggable="true" data-acc="menu" title="Arrastrar para mover · clic para opciones">${ICONOS.agarre}</button></div>` : "";
    return `<div class="bloque b-${b.tipo}" data-i="${i}" data-id="${esc(b.id)}"${b.tipo === "aviso" ? ` data-color="${esc(b.color || "naranja")}"` : ""}>${manijas}<div class="bloque-cuerpo">${cuerpoBloque(b, i)}</div></div>`;
  }

  function vistaTexto(b) {
    if (!b.texto.trim()) return `<span class="ph">${puede ? "Escribí «/» para elegir un tipo de bloque" : ""}</span>`;
    if (b.tipo === "lista") return `<ul>${b.texto.split("\n").filter(Boolean).map(l => `<li>${enLinea(l)}</li>`).join("")}</ul>`;
    if (b.tipo === "codigo") return esc(b.texto);
    if (b.tipo === "titulo" || b.tipo === "subtitulo") return enLinea(b.texto);
    return textoRico(b.texto);
  }

  function filasTareas(b) {
    return b.texto.split("\n").map(l => { const m = /^\[( |x)\]\s?(.*)$/.exec(l); return { hecha: !!m && m[1] === "x", t: m ? m[2] : l }; });
  }
  const textoTareas = f => f.map(x => `[${x.hecha ? "x" : " "}] ${x.t}`).join("\n");

  function cuerpoBloque(b, i) {
    if (DE_TEXTO.includes(b.tipo)) {
      const ico = b.tipo === "aviso" ? `<span class="aviso-ico">${ICONOS.aviso}</span>` : "";
      const inner = editando === i && puede
        ? `<textarea class="ed" rows="1" data-i="${i}" maxlength="20000" spellcheck="true" placeholder="Escribí «/» para elegir un tipo de bloque">${esc(b.texto)}</textarea>`
        : `<div class="vista${puede ? " editable" : ""}" data-i="${i}">${vistaTexto(b)}</div>`;
      return b.tipo === "aviso" ? `${ico}<div class="aviso-txt">${inner}</div>` : inner;
    }
    if (b.tipo === "tareas") {
      return `<ul class="tareas">${filasTareas(b).map((f, j) => `<li class="${f.hecha ? "hecha" : ""}" data-j="${j}"><input type="checkbox" ${f.hecha ? "checked" : ""} ${puede ? "" : "disabled"} aria-label="Hecha">${puede
        ? `<input type="text" class="t-txt" value="${esc(f.t)}" maxlength="500" placeholder="Tarea">` : `<span>${enLinea(f.t)}</span>`}</li>`).join("")}</ul>`;
    }
    if (b.tipo === "imagen") {
      if (b._subiendo) return `<div class="subiendo">Subiendo imagen…</div>`;
      return `<figure><img src="${esc(b.url)}" alt="${esc(b.texto || "Imagen")}" loading="lazy"${b.ancho ? ` width="${b.ancho}" height="${b.alto}"` : ""}>${puede
        ? `<figcaption><input type="text" class="pie-img" value="${esc(b.texto)}" maxlength="300" placeholder="Agregar un pie de foto"></figcaption>`
        : b.texto ? `<figcaption>${esc(b.texto)}</figcaption>` : ""}</figure>`;
    }
    if (b.tipo === "subpagina") {
      const sp = porId(b.paginaId);
      return sp ? `<a href="#pagina/${esc(sp.id)}">${ICONOS.doc}<span>${esc(nombre(sp))}</span></a>` : `<div class="borrada">Esta subpágina ya no existe</div>`;
    }
    return `<hr>`;
  }

  function pintarBloques() {
    $("bloques").innerHTML = bloques.map(htmlBloque).join("");
    $("bloques").querySelectorAll("textarea.ed").forEach(crecer);
  }
  function pintarUno(i) {
    const el = $("bloques").querySelector(`.bloque[data-i="${i}"]`);
    if (!el) return pintarBloques();
    const t = document.createElement("template");
    t.innerHTML = htmlBloque(bloques[i], i);
    el.replaceWith(t.content.firstElementChild);
    const ta = $("bloques").querySelector(`.bloque[data-i="${i}"] textarea.ed`); if (ta) crecer(ta);
  }
  function crecer(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }

  function enfocar(i, alFinal = true) {
    if (i < 0 || i >= bloques.length) return;
    const anterior = editando;
    ultimo = i;
    if (!DE_TEXTO.includes(bloques[i].tipo) || !puede) return;
    editando = i;
    if (anterior !== null && anterior !== i && bloques[anterior]) pintarUno(anterior);
    pintarUno(i);
    const ta = $("bloques").querySelector(`.bloque[data-i="${i}"] textarea.ed`);
    if (ta) { ta.focus({ preventScroll: false }); const n = alFinal ? ta.value.length : 0; ta.setSelectionRange(n, n); }
  }
  function enfocarTarea(i, j) {
    const inp = $("bloques").querySelector(`.bloque[data-i="${i}"] li[data-j="${j}"] .t-txt`);
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }

  function nuevoBloque(tipo, extra = {}) {
    const b = { id: nuevoId(), tipo, texto: "", ...extra };
    if (tipo === "tareas") b.texto = "[ ] ";
    if (tipo === "aviso") b.color = "naranja";
    return b;
  }
  function insertar(despuesDe, tipo, extra) {
    editando = null;
    bloques.splice(despuesDe + 1, 0, nuevoBloque(tipo, extra));
    pintarBloques(); programar();
    const i = despuesDe + 1;
    if (tipo === "tareas") enfocarTarea(i, 0); else enfocar(i);
    return i;
  }
  function quitar(i) {
    editando = null;
    bloques.splice(i, 1);
    pintarBloques(); programar();
  }

  // Cambia un bloque por otro tipo (o lo inserta, si el tipo necesita datos)
  async function aplicarTipo(i, tipo, { reemplazar }) {
    if (tipo === "imagen") { ultimo = reemplazar ? i - 1 : i; if (reemplazar) quitar(i); $("archivo-img").click(); return; }
    if (tipo === "subpagina") {
      const n = await crearSub();
      if (!n) return;
      if (reemplazar) bloques[i] = nuevoBloque("subpagina", { paginaId: n.id, id: bloques[i].id });
      else bloques.splice(i + 1, 0, nuevoBloque("subpagina", { paginaId: n.id }));
      pintarBloques(); await guardarYa();
      toast("Subpágina creada: tocá el enlace para abrirla");
      return;
    }
    if (reemplazar) {
      const b = bloques[i]; b.tipo = tipo; b.texto = tipo === "tareas" ? "[ ] " : "";
      if (tipo === "aviso") b.color = "naranja"; else delete b.color;
      editando = null; pintarBloques(); programar();
      if (tipo === "tareas") enfocarTarea(i, 0); else if (tipo === "separador") ultimo = i; else enfocar(i);
    } else insertar(i, tipo);
  }
  async function crearSub() {
    try {
      const n = await R.api.paginas.crear({ titulo: "Subpágina", padreId: p.id });
      R.estado.paginas.push(resumen(n)); abiertas.add(p.id); guardarAbiertas(); pintarArbol();
      return n;
    } catch (e) { toast(e.message, "error", 5000); return null; }
  }
  async function guardarYa() { sucio = true; await guardar(); }

  async function menuTipos(ancla, i, reemplazar) {
    const v = await menu(ancla, [{ titulo: "Bloques básicos" }, ...TIPOS.map(t => ({ valor: t.tipo, texto: t.nombre, desc: t.desc, ico: t.ico }))]);
    return v;
  }

  async function menuBloque(ancla, i) {
    const b = bloques[i];
    const items = [{ valor: "dup", texto: "Duplicar", ico: "copiar2" }];
    if (b.tipo === "aviso") items.push({ sep: true }, { titulo: "Color" }, ...COLORES_AVISO.map(([v, t]) => ({ valor: "c:" + v, texto: t, elegido: (b.color || "naranja") === v })));
    if (DE_TEXTO.includes(b.tipo) || b.tipo === "tareas") items.push({ sep: true }, { titulo: "Convertir en" }, ...TIPOS.filter(t => t.tipo !== b.tipo && ![ "imagen", "subpagina", "separador" ].includes(t.tipo)).map(t => ({ valor: "t:" + t.tipo, texto: t.nombre, ico: t.ico })));
    items.push({ sep: true }, { valor: "del", texto: "Eliminar", ico: "borrar", peligro: true });
    const v = await menu(ancla, items);
    if (!v) return;
    if (v === "del") return quitar(i);
    if (v === "dup") { const c = { ...bloques[i], id: nuevoId() }; bloques.splice(i + 1, 0, c); pintarBloques(); return programar(); }
    if (v.startsWith("c:")) { b.color = v.slice(2); pintarBloques(); return programar(); }
    if (v.startsWith("t:")) {
      const nuevo = v.slice(2);
      if (b.tipo === "tareas") b.texto = filasTareas(b).map(f => f.t).join("\n");
      if (nuevo === "tareas") b.texto = b.texto.split("\n").map(l => `[ ] ${l}`).join("\n");
      b.tipo = nuevo; if (nuevo === "aviso") b.color = "naranja"; else delete b.color;
      editando = null; pintarBloques(); programar();
    }
  }

  // ---------- Imágenes ----------
  async function subirImagenes(archivos) {
    if (!puede) return;
    if (!R.estado.imagenes) return toast("Las imágenes todavía no están configuradas: faltan los datos de Cloudinary en el servidor.", "error", 7000);
    const validos = [...archivos].filter(f => /^image\/(png|jpe?g|gif|webp)$/.test(f.type));
    if (!validos.length) return toast("Solo se pueden subir imágenes PNG, JPG, GIF o WebP", "error");
    for (const f of validos) {
      if (f.size > MAX_MB * 1024 * 1024) { toast(`"${f.name}" pesa más de ${MAX_MB} MB`, "error", 5000); continue; }
      const marca = nuevoBloque("imagen", { _subiendo: true });
      const pos = ultimo >= 0 && ultimo < bloques.length ? ultimo + 1 : bloques.length;
      bloques.splice(pos, 0, marca); ultimo = pos; editando = null; pintarBloques();
      try {
        const r = await R.api.imagenes.subir(f);
        Object.assign(marca, { url: r.url, publicId: r.publicId, ancho: r.ancho, alto: r.alto, texto: "" }); delete marca._subiendo;
        pintarBloques(); programar();
      } catch (e) {
        const k = bloques.indexOf(marca); if (k >= 0) bloques.splice(k, 1);
        pintarBloques(); toast(e.message, "error", 7000);
      }
    }
  }

  // ---------- Propiedades y datos de la página ----------
  function pintarMeta() {
    const m = $("pag-meta"); if (!m) return;
    m.innerHTML = `<span>${p.actualizado ? `Editada ${R.util.fmtFechaHora(p.actualizado)}${p.actualizadoPor ? " por " + esc(p.actualizadoPor) : ""}` : ""}</span><span class="relleno-meta"></span>` +
      (puede ? `<button type="button" class="btn-texto" id="pag-mover">${ICONOS.mover}Mover</button><button type="button" class="btn-texto" id="pag-borrar">${ICONOS.borrar}Borrar</button>` : "");
  }
  function pintarHijas() {
    const enBloques = new Set(bloques.filter(b => b.tipo === "subpagina").map(b => b.paginaId));
    const sueltas = hijos(p.id).filter(h => !enBloques.has(h.id));
    $("pag-hijas").innerHTML = sueltas.length ? `<h2>Subpáginas</h2><div class="lista-paginas">${sueltas.map(h => `<a class="tarjeta-pagina" href="#pagina/${esc(h.id)}">${ICONOS.doc}<span><strong>${esc(nombre(h))}</strong></span></a>`).join("")}</div>` : "";
  }

  function pintarPagina() {
    const equipos = [...R.estado.equipos].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
    const eq = p.equipoId && R.app.equipo(p.equipoId);
    $("vista-pagina").innerHTML = `<article class="pagina">
      <textarea class="pag-titulo" id="pag-titulo" rows="1" maxlength="200" placeholder="Sin título" ${puede ? "" : "readonly"}>${esc(p.titulo)}</textarea>
      <dl class="pag-props">
        <dt>${ICONOS.equipo}Equipo</dt><dd${puede ? "" : ` class="solo-lectura"`}>${puede
          ? `<select id="pag-equipo"><option value="">Sin equipo</option>${equipos.map(e => `<option value="${esc(e.id)}" ${e.id === p.equipoId ? "selected" : ""}>${esc(e.descripcion)}</option>`).join("")}</select>`
          : eq ? `<a class="link" href="#equipos" data-equipo="${esc(eq.id)}">${esc(eq.descripcion)}</a>` : `<span class="cero">—</span>`}</dd>
        <dt>${ICONOS.lista}Etiquetas</dt><dd${puede ? "" : ` class="solo-lectura"`}>${puede
          ? `<input id="pag-etiquetas" maxlength="300" placeholder="Separadas por coma" value="${esc((p.etiquetas || []).join(", "))}">`
          : (p.etiquetas || []).length ? `<span class="chips">${p.etiquetas.map(t => `<span class="chip etq">${esc(t)}</span>`).join("")}</span>` : `<span class="cero">—</span>`}</dd>
      </dl>
      <div class="pag-meta" id="pag-meta"></div>
      <div id="bloques" class="bloques"></div>
      ${puede ? `<button type="button" class="pag-agregar" id="pag-agregar">${ICONOS.mas}Agregar un bloque</button>` : ""}
      <div class="pag-hijas" id="pag-hijas"></div>
    </article>`;
    pintarMeta(); pintarBloques(); pintarHijas();
    crecer($("pag-titulo"));
  }

  async function mostrar(id) {
    if (!id) { await guardarPendiente(); return mostrarIndice(); }
    if (p && p.id !== id) await guardarPendiente();
    const mio = ++cargaId;
    actualId = id; expandirHasta(id); pintarArbol();
    $("vista-pagina").innerHTML = `<article class="pagina"><span class="esq" style="width:55%;height:40px"></span><span class="esq" style="width:80%;height:14px;margin-top:24px"></span><span class="esq" style="width:70%;height:14px;margin-top:10px"></span></article>`;
    R.app.ruta(`<a href="#pagina">Páginas</a><span class="sep">/</span><span>${esc(nombre(porId(id)))}</span>`);
    let n;
    try { n = await R.api.paginas.obtener(id); }
    catch (e) { if (mio !== cargaId) return; toast(e.message, "error", 5000); location.hash = "#pagina"; return; }
    if (mio !== cargaId) return;
    p = n; puede = R.app.puedeEditar(); editando = null; ultimo = -1; sucio = false;
    bloques = (n.bloques || []).map(b => ({ ...b }));
    estadoGuardado("");
    pintarPagina(); pintarRuta();
    if (puede && !p.titulo && !bloques.length) $("pag-titulo").focus();
  }
  async function guardarPendiente() { if (sucio) await guardar(); }

  // ---------- Eventos ----------
  function iniciar() {
    // Árbol del menú lateral
    $("arbol").addEventListener("click", e => {
      const fila = e.target.closest(".arbol-fila"); if (!fila) return;
      const id = fila.dataset.id;
      if (e.target.closest("[data-caret]")) {
        if (abiertas.has(id)) abiertas.delete(id); else abiertas.add(id);
        guardarAbiertas(); pintarArbol(); return;
      }
      if (e.target.closest("[data-nueva]")) { e.stopPropagation(); crear(id); return; }
      location.hash = "#pagina/" + id;
    });
    $("arbol-nueva").addEventListener("click", () => crear(null));

    const vista = $("vista-pagina");
    vista.addEventListener("input", e => {
      if (!p) return;
      const t = e.target;
      if (t.id === "pag-titulo") {
        t.value = t.value.replace(/\n/g, " "); p.titulo = t.value; crecer(t);
        const r = porId(p.id); if (r) r.titulo = p.titulo;
        const fila = document.querySelector(`.arbol-fila[data-id="${p.id}"] .nombre`);
        if (fila) { fila.textContent = nombre(p); fila.classList.toggle("sin", !p.titulo); }
        programar();
      } else if (t.id === "pag-etiquetas") { p.etiquetas = t.value.split(",").map(s => s.trim()).filter(Boolean); programar(); }
      else if (t.matches("textarea.ed")) {
        const i = Number(t.dataset.i), b = bloques[i]; b.texto = t.value; crecer(t);
        if (b.tipo === "texto" && t.value === "/") slash(t, i);
        else programar();
      } else if (t.matches(".t-txt")) {
        const li = t.closest("li"), bi = Number(t.closest(".bloque").dataset.i), f = filasTareas(bloques[bi]);
        f[Number(li.dataset.j)].t = t.value; bloques[bi].texto = textoTareas(f); programar();
      } else if (t.matches(".pie-img")) { bloques[Number(t.closest(".bloque").dataset.i)].texto = t.value; programar(); }
    });
    vista.addEventListener("change", e => {
      const t = e.target;
      if (t.id === "pag-equipo") { p.equipoId = t.value || null; const r = porId(p.id); if (r) r.equipoId = p.equipoId; programar(); }
      else if (t.matches('.tareas input[type="checkbox"]') && puede) {
        const li = t.closest("li"), bi = Number(t.closest(".bloque").dataset.i), f = filasTareas(bloques[bi]);
        f[Number(li.dataset.j)].hecha = t.checked; bloques[bi].texto = textoTareas(f);
        li.classList.toggle("hecha", t.checked); programar();
      }
    });
    // Activar la edición de un bloque de texto: mousedown (no click), para que el cambio
    // de vista a editor no mueva el bloque justo cuando se suelta el mouse
    vista.addEventListener("mousedown", e => {
      const v = e.target.closest(".vista.editable"); if (!v) return;
      if (e.target.closest("a")) return;
      e.preventDefault(); enfocar(Number(v.dataset.i));
    });
    vista.addEventListener("focusout", e => {
      const t = e.target;
      if (t.matches && t.matches("textarea.ed")) {
        const i = Number(t.dataset.i);
        setTimeout(() => { if (editando === i && document.activeElement !== t) { editando = null; if (bloques[i]) pintarUno(i); } }, 0);
      }
    });
    vista.addEventListener("keydown", e => {
      const t = e.target;
      if (t.id === "pag-titulo" && e.key === "Enter") { e.preventDefault(); if (puede) { if (!bloques.length) insertar(-1, "texto"); else enfocar(0, false); } return; }
      if (t.matches("textarea.ed")) return teclaTexto(e, t);
      if (t.matches(".t-txt")) return teclaTarea(e, t);
    });
    vista.addEventListener("click", e => {
      const b = e.target.closest("[data-acc]");
      if (b) {
        const i = Number(b.closest(".bloque").dataset.i);
        if (b.dataset.acc === "mas") menuTipos(b, i, false).then(v => { if (v) aplicarTipo(i, v, { reemplazar: false }); });
        else menuBloque(b, i);
        return;
      }
      if (e.target.closest("#pag-agregar")) { const a = $("pag-agregar"); menuTipos(a, bloques.length - 1, false).then(v => { if (v) aplicarTipo(bloques.length - 1, v, { reemplazar: false }); }); return; }
      if (e.target.closest("#pag-mover")) return mover();
      if (e.target.closest("#pag-borrar")) return borrar();
      const eq = e.target.closest("[data-equipo]");
      if (eq) { e.preventDefault(); R.vistaFicha.abrir(eq.dataset.equipo); return; }
      const bl = e.target.closest(".bloque");
      if (bl) ultimo = Number(bl.dataset.i);
    });

    // Arrastrar bloques
    vista.addEventListener("dragstart", e => {
      const a = e.target.closest(".agarre"); if (!a) return;
      arrastrando = Number(a.closest(".bloque").dataset.i);
      e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "bloque");
      a.closest(".bloque").classList.add("arrastrando");
    });
    const limpiarGuias = () => vista.querySelectorAll(".soltar-arriba, .soltar-abajo, .arrastrando").forEach(x => x.classList.remove("soltar-arriba", "soltar-abajo", "arrastrando"));
    vista.addEventListener("dragover", e => {
      if (arrastrando !== null) {
        const bl = e.target.closest(".bloque"); if (!bl) return;
        e.preventDefault();
        vista.querySelectorAll(".soltar-arriba, .soltar-abajo").forEach(x => x.classList.remove("soltar-arriba", "soltar-abajo"));
        const r = bl.getBoundingClientRect();
        bl.classList.add(e.clientY < r.top + r.height / 2 ? "soltar-arriba" : "soltar-abajo");
      } else if (puede && e.dataTransfer && [...e.dataTransfer.types].includes("Files")) { e.preventDefault(); vista.classList.add("soltar-archivo"); }
    });
    vista.addEventListener("dragleave", e => { if (!vista.contains(e.relatedTarget)) vista.classList.remove("soltar-archivo"); });
    vista.addEventListener("drop", e => {
      vista.classList.remove("soltar-archivo");
      if (arrastrando !== null) {
        const bl = e.target.closest(".bloque"); e.preventDefault();
        if (bl) {
          const r = bl.getBoundingClientRect(), a = Number(bl.dataset.i);
          let destino = a + (e.clientY < r.top + r.height / 2 ? 0 : 1);
          const [m] = bloques.splice(arrastrando, 1);
          if (arrastrando < destino) destino--;
          bloques.splice(destino, 0, m);
          editando = null; pintarBloques(); programar();
        }
        arrastrando = null; limpiarGuias();
      } else if (puede && e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); subirImagenes(e.dataTransfer.files); }
    });
    vista.addEventListener("dragend", () => { arrastrando = null; limpiarGuias(); });

    // Imágenes: selector de archivos y pegar
    $("archivo-img").addEventListener("change", e => { const f = [...e.target.files]; e.target.value = ""; if (f.length) subirImagenes(f); });
    document.addEventListener("paste", e => {
      if (!puede || vista.hidden || !p) return;
      const archivos = [...(e.clipboardData ? e.clipboardData.files : [])].filter(f => f.type.startsWith("image/"));
      if (archivos.length) { e.preventDefault(); subirImagenes(archivos); }
    });

    // Que no se pierda lo escrito al cerrar la pestaña
    window.addEventListener("beforeunload", e => { if (sucio) { e.preventDefault(); e.returnValue = ""; } });
    document.addEventListener("visibilitychange", () => { if (document.hidden) guardarPendiente(); });
  }

  async function slash(ta, i) {
    const v = await menuTipos(ta, i, true);
    if (!v) { bloques[i].texto = ""; pintarUno(i); enfocar(i); return; }
    bloques[i].texto = "";
    aplicarTipo(i, v, { reemplazar: true });
  }

  function teclaTexto(e, ta) {
    const i = Number(ta.dataset.i), b = bloques[i];
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      if (b.tipo === "codigo" || b.tipo === "aviso") return;                // acá Enter es salto de línea
      e.preventDefault();
      if (b.tipo === "lista") {
        const antes = ta.value.slice(0, ta.selectionStart), lineas = antes.split("\n");
        if (lineas[lineas.length - 1] === "" && ta.selectionStart === ta.value.length) {   // Enter en un ítem vacío: sale de la lista
          b.texto = ta.value.replace(/\n$/, ""); insertar(i, "texto"); return;
        }
        const pos = ta.selectionStart;
        b.texto = ta.value.slice(0, pos) + "\n" + ta.value.slice(ta.selectionEnd);
        ta.value = b.texto; ta.setSelectionRange(pos + 1, pos + 1); crecer(ta); programar(); return;
      }
      const resto = ta.value.slice(ta.selectionStart);       // lo que quedó después del cursor pasa al bloque nuevo
      b.texto = ta.value.slice(0, ta.selectionStart);
      editando = null;
      bloques.splice(i + 1, 0, nuevoBloque("texto", { texto: resto }));
      pintarBloques(); programar(); enfocar(i + 1, false);
    } else if (e.key === "Backspace" && ta.value === "" && bloques.length > 0) {
      e.preventDefault(); quitar(i); enfocar(Math.max(0, i - 1));
    } else if (e.key === "ArrowUp" && ta.selectionStart === 0 && !e.shiftKey) {
      const k = [...Array(i).keys()].reverse().find(j => DE_TEXTO.includes(bloques[j].tipo));
      if (k !== undefined) { e.preventDefault(); enfocar(k); }
    } else if (e.key === "ArrowDown" && ta.selectionStart === ta.value.length && !e.shiftKey) {
      const k = bloques.findIndex((x, j) => j > i && DE_TEXTO.includes(x.tipo));
      if (k >= 0) { e.preventDefault(); enfocar(k, false); }
    } else if (e.key === "Escape") { ta.blur(); }
  }

  function teclaTarea(e, inp) {
    const bl = inp.closest(".bloque"), i = Number(bl.dataset.i), j = Number(inp.closest("li").dataset.j);
    const f = filasTareas(bloques[i]);
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      if (inp.value === "" && j === f.length - 1) {             // Enter en una tarea vacía al final: sale de la lista
        f.pop(); if (!f.length) { quitar(i); insertar(i - 1, "texto"); return; }
        bloques[i].texto = textoTareas(f); pintarUno(i); insertar(i, "texto"); return;
      }
      f.splice(j + 1, 0, { hecha: false, t: "" }); bloques[i].texto = textoTareas(f);
      pintarUno(i); programar(); enfocarTarea(i, j + 1);
    } else if (e.key === "Backspace" && inp.value === "") {
      e.preventDefault();
      if (f.length === 1) { quitar(i); enfocar(Math.max(0, i - 1)); return; }
      f.splice(j, 1); bloques[i].texto = textoTareas(f); pintarUno(i); programar(); enfocarTarea(i, Math.max(0, j - 1));
    }
  }

  R.vistaPaginas = {
    iniciar, mostrar, pintarArbol, crear, guardarPendiente,
    // Para la ficha de un equipo y el tablero
    delEquipo: equipoId => lista().filter(x => x.equipoId === equipoId),
  };
})(window.PANELIT);

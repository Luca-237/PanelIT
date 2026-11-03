window.PANELIT = window.PANELIT || {};

(function (R) {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Para comparar/buscar: sin tildes, minúsculas, sin espacios extremos
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  // ---------- Fechas ----------
  const fmtFecha = f => f ? new Date(f).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const fmtFechaHora = f => f ? new Date(f).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  // 1350901742 → "1 350 901 742" (como lo muestran TeamViewer y AnyDesk)
  const fmtId = id => String(id || "").replace(/\s/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  let timerToast;
  function toast(mensaje, tipo = "ok", ms = 3500) {
    const el = $("toast");
    el.textContent = mensaje;
    el.classList.toggle("error", tipo === "error");
    el.hidden = false;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => { el.hidden = true; }, ms);
  }

  async function copiar(texto, boton) {
    try {
      await navigator.clipboard.writeText(texto);
      if (boton) { boton.classList.add("listo"); setTimeout(() => boton.classList.remove("listo"), 1200); }
      toast("Copiado");
    } catch (e) { toast("No se pudo copiar: el navegador no lo permite", "error"); }
  }

  // CSV para Excel en español: separador ";" y BOM para que respete las tildes
  function descargarCSV(nombreArchivo, filas) {
    const celda = v => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const texto = "﻿" + filas.map(f => f.map(celda).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    a.download = nombreArchivo;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Cierra cualquier diálogo con los botones [data-cerrar]
  function iniciarDialogos() {
    document.addEventListener("click", e => {
      const b = e.target.closest("[data-cerrar]");
      if (b) b.closest("dialog").close();
    });
  }

  // ---------- Íconos (Lucide, SVG en línea; nunca emojis) ----------
  const svg = cuerpo => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cuerpo}</svg>`;
  const ICONOS = {
    menu: svg(`<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>`),
    tablero: svg(`<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>`),
    equipo: svg(`<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>`),
    servidor: svg(`<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>`),
    nota: svg(`<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>`),
    usuarios: svg(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),
    actividad: svg(`<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>`),
    cerrar: svg(`<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`),
    mas: svg(`<path d="M5 12h14"/><path d="M12 5v14"/>`),
    buscar: svg(`<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`),
    descargar: svg(`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>`),
    copiar: svg(`<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`),
    ver: svg(`<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`),
    ocultar: svg(`<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>`),
    lapiz: svg(`<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>`),
    borrar: svg(`<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>`),
    pin: svg(`<line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>`),
    salir: svg(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>`),
    llave: svg(`<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>`),
    alerta: svg(`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`),
    subir: svg(`<path d="m18 15-6-6-6 6"/>`),
    bajar: svg(`<path d="m6 9 6 6 6-6"/>`),
    sol: svg(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`),
    luna: svg(`<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`),
    pantalla: svg(`<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>`),
    doc: svg(`<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`),
    derecha: svg(`<path d="m9 18 6-6-6-6"/>`),
    agarre: svg(`<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>`),
    imagen: svg(`<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>`),
    tareas: svg(`<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`),
    lista: svg(`<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>`),
    codigo: svg(`<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`),
    titulo: svg(`<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/>`),
    subtitulo: svg(`<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>`),
    texto: svg(`<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>`),
    aviso: svg(`<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`),
    separador: svg(`<path d="M5 12h14"/>`),
    mover: svg(`<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>`),
    copiar2: svg(`<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`),
    tilde: svg(`<path d="M20 6 9 17l-5-5"/>`),
  };
  // <i data-ico="nombre"> → el SVG (para el HTML fijo)
  function pintarIconos(raiz = document) {
    raiz.querySelectorAll("i[data-ico]").forEach(i => {
      const t = document.createElement("template");
      t.innerHTML = ICONOS[i.dataset.ico] || "";
      const s = t.content.firstElementChild;
      if (!s) return;
      if (i.className) s.setAttribute("class", i.className);
      i.replaceWith(s);
    });
  }

  // ---------- Tema claro / oscuro ----------
  const TEMAS = { oscuro: ["Oscuro", "luna"], claro: ["Claro", "sol"], sistema: ["Según el sistema", "pantalla"] };
  const temaGuardado = () => { try { return localStorage.getItem("panelit.tema") || "oscuro"; } catch (e) { return "oscuro"; } };
  function aplicarTema(t) {
    const h = document.documentElement;
    h.dataset.tema = ["claro", "oscuro", "sistema"].includes(t) ? t : "oscuro";
  }
  function cambiarTema(t) {
    try { localStorage.setItem("panelit.tema", t); } catch (e) {}
    aplicarTema(t);
  }

  // ---------- Menú flotante ----------
  // items: [{ valor, texto, desc, ico, peligro, elegido }] o { sep:true } o { titulo:"…" }.
  // ancla: un elemento o { x, y }. Devuelve una promesa con el valor elegido (o null).
  function menu(ancla, items, { alineado = "izq" } = {}) {
    return new Promise(resolver => {
      const m = document.createElement("div");
      m.className = "menu-flotante";
      m.innerHTML = items.map((it, i) => it.sep ? "<hr>" : it.titulo ? `<div class="menu-titulo">${esc(it.titulo)}</div>` :
        `<button type="button" data-i="${i}" class="${it.peligro ? "peligro" : ""}${it.elegido ? " elegido" : ""}">${it.ico ? `<span class="${it.desc ? "ico-caja" : ""}">${ICONOS[it.ico] || ""}</span>` : ""}<span>${esc(it.texto)}${it.desc ? `<small>${esc(it.desc)}</small>` : ""}</span>${it.elegido ? `<span class="marca-ok">${ICONOS.tilde}</span>` : ""}</button>`).join("");
      (document.querySelector("dialog[open]") || document.body).appendChild(m);
      const r = ancla.getBoundingClientRect ? ancla.getBoundingClientRect() : { left: ancla.x, right: ancla.x, top: ancla.y, bottom: ancla.y };
      const g = m.getBoundingClientRect();
      let left = alineado === "der" ? r.right - g.width : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - g.width - 8));
      let top = r.bottom + 4;
      if (top + g.height > window.innerHeight - 8) top = Math.max(8, r.top - g.height - 4);
      m.style.left = left + "px"; m.style.top = top + "px";
      const cerrar = valor => {
        document.removeEventListener("mousedown", fuera, true);
        document.removeEventListener("keydown", tecla, true);
        m.remove(); resolver(valor);
      };
      const fuera = e => { if (!m.contains(e.target)) cerrar(null); };
      const tecla = e => { if (e.key === "Escape") { e.stopPropagation(); cerrar(null); } };
      m.addEventListener("click", e => {
        const b = e.target.closest("button[data-i]");
        if (b) cerrar(items[Number(b.dataset.i)].valor);
      });
      setTimeout(() => { document.addEventListener("mousedown", fuera, true); document.addEventListener("keydown", tecla, true); }, 0);
      const primero = m.querySelector("button"); if (primero) primero.focus({ preventScroll: true });
    });
  }

  async function menuTema(ancla) {
    const actual = temaGuardado();
    const t = await menu(ancla, Object.entries(TEMAS).map(([valor, [texto, ico]]) => ({ valor, texto, ico, elegido: valor === actual })), { alineado: "izq" });
    if (t) cambiarTema(t);
    return t;
  }

  // Formato en una línea: `código` y **negrita**. Siempre se escapa primero.
  const enLinea = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Texto con formato mínimo: líneas "- " = viñetas, **negrita**, `código`.
  // Siempre se escapa primero: nunca se inserta HTML escrito por un usuario.
  function textoRico(texto) {
    const out = [];
    let lista = null;
    String(texto || "").split(/\r?\n/).forEach(l => {
      if (/^\s*[-•]\s+/.test(l)) {
        if (!lista) { lista = []; out.push(lista); }
        lista.push(`<li>${enLinea(l.replace(/^\s*[-•]\s+/, ""))}</li>`);
      } else {
        lista = null;
        if (l.trim()) out.push(`<p>${enLinea(l)}</p>`);
      }
    });
    return out.map(x => Array.isArray(x) ? `<ul>${x.join("")}</ul>` : x).join("");
  }

  // ---------- Ayudas "i" ----------
  const info = texto => `<span class="info" tabindex="0" role="img" aria-label="${esc(texto)}" data-info="${esc(texto)}"></span>`;

  function iniciarAyudas() {
    const globo = document.createElement("div");
    globo.className = "globo-info";
    globo.setAttribute("role", "tooltip");
    globo.hidden = true;
    let actual = null;
    function mostrar(el) {
      actual = el;
      (el.closest("dialog[open]") || document.body).appendChild(globo);
      globo.textContent = el.dataset.info;
      globo.hidden = false;
      const r = el.getBoundingClientRect(), g = globo.getBoundingClientRect(), m = 8;
      let left = r.left + r.width / 2 - g.width / 2;
      left = Math.max(m, Math.min(left, window.innerWidth - g.width - m));
      let top = r.top - g.height - 8;
      if (top < m) top = r.bottom + 8;
      globo.style.left = `${left}px`;
      globo.style.top = `${top}px`;
    }
    function ocultar() { actual = null; globo.hidden = true; }
    document.addEventListener("mouseover", e => { const el = e.target.closest("[data-info]"); if (el && el !== actual) mostrar(el); });
    document.addEventListener("mouseout", e => { const el = e.target.closest("[data-info]"); if (el && el === actual && !el.contains(e.relatedTarget)) ocultar(); });
    document.addEventListener("focusin", e => { if (e.target.matches("[data-info]:focus-visible")) mostrar(e.target); });
    document.addEventListener("focusout", e => { if (e.target === actual) ocultar(); });
    document.addEventListener("scroll", () => { if (actual) ocultar(); }, true);
    document.addEventListener("click", e => { if (e.target.closest(".info[data-info]")) e.stopPropagation(); }, true);
  }

  // ---------- Diálogos propios (en vez de confirm/prompt del navegador) ----------
  let dlgPregunta = null;
  function armarDialogo() {
    if (dlgPregunta) return dlgPregunta;
    dlgPregunta = document.createElement("dialog");
    dlgPregunta.className = "dlg dlg-pregunta";
    dlgPregunta.innerHTML = `<form method="dialog">
      <div class="dlg-head"><h3></h3></div>
      <div class="dlg-body"><p class="pregunta-texto"></p><div class="pregunta-campos"></div>
        <div class="mensaje-error" role="alert"></div>
        <div class="dlg-pie"><button type="button" class="btn-sec" value="no">Cancelar</button><button type="submit" class="btn-sec primario" value="si">Aceptar</button></div></div>
    </form>`;
    document.body.appendChild(dlgPregunta);
    return dlgPregunta;
  }

  // campos: [{ nombre, etiqueta, valor, tipo, requerido, min, ayuda, multilinea }] → { nombre: valor } o null si cancela
  function formulario({ titulo, texto = "", campos = [], aceptar = "Aceptar", peligro = false }) {
    const d = armarDialogo();
    (document.querySelector("dialog[open]:not(.dlg-pregunta)") || document.body).appendChild(d);
    d.querySelector("h3").textContent = titulo;
    d.querySelector(".pregunta-texto").textContent = texto;
    d.querySelector(".pregunta-texto").hidden = !texto;
    d.querySelector(".mensaje-error").textContent = "";
    d.querySelector(".pregunta-campos").innerHTML = campos.map((c, i) => `<label for="preg-${i}">${esc(c.etiqueta)}</label>
      ${c.multilinea ? `<textarea id="preg-${i}" name="${esc(c.nombre)}" ${c.requerido ? "required" : ""}>${esc(c.valor ?? "")}</textarea>`
        : `<input id="preg-${i}" name="${esc(c.nombre)}" type="${c.tipo || "text"}" value="${esc(c.valor ?? "")}" ${c.requerido ? "required" : ""} ${c.min ? `minlength="${c.min}"` : ""} autocomplete="off">`}
      ${c.ayuda ? `<div class="hint">${esc(c.ayuda)}</div>` : ""}`).join("");
    const ok = d.querySelector('button[value="si"]');
    ok.textContent = aceptar;
    ok.classList.toggle("peligro", peligro);
    return new Promise(resolver => {
      const cancelar = d.querySelector('button[value="no"]');
      const form = d.querySelector("form");
      const terminar = valor => { d.close(); form.onsubmit = null; cancelar.onclick = null; d.oncancel = null; resolver(valor); };
      form.onsubmit = e => {
        e.preventDefault();
        const datos = {};
        campos.forEach((c, i) => { datos[c.nombre] = d.querySelector(`#preg-${i}`).value.trim(); });
        terminar(datos);
      };
      cancelar.onclick = () => terminar(null);
      d.oncancel = e => { e.preventDefault(); terminar(null); };
      d.showModal();
      (d.querySelector(".pregunta-campos input, .pregunta-campos textarea") || ok).focus();
    });
  }
  const confirmar = (texto, { titulo = "Confirmar", aceptar = "Aceptar", peligro = false } = {}) =>
    formulario({ titulo, texto, aceptar, peligro }).then(r => r !== null);

  // ---------- Esqueletos de carga ----------
  const ANCHOS = [72, 48, 86, 60, 40, 78, 54, 66, 90, 45];
  const barra = (ancho, alto = 12, extra = "") => `<span class="esq" style="width:${ancho}${typeof ancho === "number" ? "%" : ""}; height:${alto}px${extra}"></span>`;
  const aviso = `<span class="sr-only">Cargando…</span>`;
  const esqueleto = {
    kpis(n = 4) {
      return aviso + Array.from({ length: n }, (_, i) => `<div class="kpi" aria-hidden="true">${barra(55 + (i % 3) * 10, 10)}${barra(38, 28, "; margin-top:12px")}${barra(70 - (i % 2) * 15, 10, "; margin-top:10px")}</div>`).join("");
    },
    filas(cols, n = 6) {
      return Array.from({ length: n }, (_, f) => `<tr class="esq-fila" aria-hidden="true">${Array.from({ length: cols }, (_, c) =>
        `<td>${c === 0 ? barra(ANCHOS[f % 10], 12) + barra(40, 9, "; margin-top:6px") : barra(ANCHOS[(f + c) % 10] - 10, 12)}</td>`).join("")}</tr>`).join("");
    },
    tabla(cols, n = 6) {
      return `<thead><tr>${Array.from({ length: cols }, (_, c) => `<th>${barra(c === 0 ? 50 : 70, 9)}</th>`).join("")}</tr></thead><tbody>${esqueleto.filas(cols, n)}</tbody>`;
    },
    lista(n = 3) {
      return Array.from({ length: n }, (_, i) => `<li aria-hidden="true"><span style="flex:1">${barra(ANCHOS[i] - 15, 12)}${barra(35, 9, "; margin-top:6px")}</span></li>`).join("");
    },
    notas(n = 6) {
      return aviso + Array.from({ length: n }, (_, i) => `<div class="nota" aria-hidden="true">${barra(ANCHOS[i % 10], 16)}${barra(90, 10)}${barra(75, 10)}${barra(50, 10)}</div>`).join("");
    },
  };

  R.util = {
    $, esc, norm, fmtFecha, fmtFechaHora, fmtId, toast, copiar, descargarCSV, iniciarDialogos,
    ICONOS, pintarIconos, textoRico, enLinea, menu, menuTema, temaGuardado, TEMAS, aplicarTema, info, iniciarAyudas, formulario, confirmar, esqueleto,
  };
})(window.PANELIT);

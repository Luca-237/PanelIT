// =====================================================================
//  Imágenes en Cloudinary con subida FIRMADA: el servidor firma los
//  parámetros y el navegador sube directo a Cloudinary. La API secret
//  nunca sale del servidor. Sin las 3 variables, las imágenes quedan
//  desactivadas y el resto del panel funciona igual.
// =====================================================================
const crypto = require("crypto");

const FORMATOS = "gif,jpg,jpeg,png,webp";

function crearCloudinary({ cloudName, apiKey, apiSecret, carpeta }) {
  const activo = !!(cloudName && apiKey && apiSecret);
  // Firma de Cloudinary: parámetros ordenados "a=1&b=2" + secret, en SHA-1
  const firmar = params => crypto.createHash("sha1")
    .update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&") + apiSecret).digest("hex");

  return {
    activo,
    cloudName,
    // Para el navegador: con esto sube un archivo (válido ~1 hora)
    firmaSubida() {
      const params = { allowed_formats: FORMATOS, folder: carpeta, timestamp: Math.floor(Date.now() / 1000) };
      return { cloudName, apiKey, ...params, signature: firmar(params), url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload` };
    },
    // Solo se aceptan imágenes de nuestra cuenta y carpeta
    urlValida(url, publicId) {
      return typeof url === "string" && url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`)
        && typeof publicId === "string" && publicId.startsWith(carpeta + "/") && url.includes(publicId);
    },
    // Borra una imagen que ya no usa ninguna página (si falla, no frena nada)
    async borrar(publicId) {
      if (!activo || !publicId) return;
      const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
      const cuerpo = new URLSearchParams({ ...params, api_key: apiKey, signature: firmar(params) });
      try { await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body: cuerpo }); }
      catch (e) { console.error("No se pudo borrar de Cloudinary:", publicId, e.message); }
    },
  };
}

module.exports = { crearCloudinary };

// ---------------------------------------------------------------------------
// Configuración derivada del entorno.
// ---------------------------------------------------------------------------

/**
 * Dirección pública del servidor: es de donde Meta descarga las piezas.
 *
 * En Render (y en varios hostings) la dirección la asigna la plataforma recién
 * al desplegar, así que se toma sola de la variable que ellos ya definen. Eso
 * evita el paso incómodo de desplegar, copiar la URL y volver a desplegar.
 *
 * Si se define PUBLIC_URL a mano, esa manda.
 */
export function publicUrl() {
  const url =
    process.env.PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL || // Render
    process.env.RAILWAY_PUBLIC_DOMAIN || // Railway (viene sin esquema)
    '';

  if (!url) return '';
  const conEsquema = url.startsWith('http') ? url : `https://${url}`;
  return conEsquema.replace(/\/$/, '');
}

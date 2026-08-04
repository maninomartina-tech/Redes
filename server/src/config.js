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

/**
 * Modo solo lectura: la app se conecta a Instagram únicamente para traer el
 * feed y las métricas, sin publicar nada.
 *
 * Sirve para arrancar sin el trámite de aprobación de Meta y sin hosting pago:
 * como no hay nada que publicar a horario, el servidor puede dormirse.
 */
export function soloLectura() {
  return String(process.env.MODO_SOLO_LECTURA ?? '').toLowerCase() === 'true';
}

/** Permisos que se le piden a Meta. En solo lectura no se pide publicar. */
export function permisos() {
  const lectura = [
    'instagram_basic',
    'instagram_manage_insights', // métricas de la cuenta y de cada publicación
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
    'ads_read', // campañas de Meta Ads
  ];
  return soloLectura() ? lectura : [...lectura, 'instagram_content_publish'];
}

/**
 * ¿Lo que se carga sobrevive a un reinicio?
 *
 * Render, Railway y compañía rehacen el disco de la aplicación en cada
 * despliegue y en cada reinicio —y el plan gratuito de Render además apaga el
 * servicio cuando nadie lo usa—. Si la base quedó ahí adentro, un día
 * cualquiera el panel aparece vacío y los links de los clientes dejan de
 * abrir, sin ningún aviso.
 *
 * Para que sobreviva hay que montar un disco y apuntarle DB_PATH y FILES_PATH.
 * Eso es lo que se comprueba acá: si estamos en una plataforma de esas y las
 * rutas no se definieron a mano, los datos están en un lugar que se borra.
 */
export function enPlataforma() {
  return Boolean(
    process.env.RENDER || process.env.RAILWAY_PUBLIC_DOMAIN || process.env.FLY_APP_NAME
  );
}

export function datosPersistentes() {
  if (!enPlataforma()) return true; // en una máquina propia, el disco es el disco
  return Boolean(process.env.DB_PATH && process.env.FILES_PATH);
}

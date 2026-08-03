/**
 * Dirección del servidor propio, definida con `VITE_API_URL` al compilar.
 *
 * Vacía significa "sin servidor": la app sigue andando en el navegador, con
 * las funciones que no dependen de él (planificar, aprobar, ver todo).
 */
export const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const hayServidor = (): boolean => API.length > 0;

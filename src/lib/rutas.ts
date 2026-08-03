import { useStore } from '@/store/useStore';

/**
 * Base de las rutas del cliente.
 *
 * Son las mismas pantallas en dos entradas distintas: `/cliente/...` es la
 * vista previa que usa la creadora desde su panel, y `/c/<link>/...` es lo que
 * abre el cliente con su link. Por eso los menús no pueden tener las rutas
 * escritas a mano.
 */
export const baseCliente = (portal: string | null | undefined): string =>
  portal ? `/c/${portal}` : '/cliente';

export const useBaseCliente = (): string => baseCliente(useStore((s) => s.portal));

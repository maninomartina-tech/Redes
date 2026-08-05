import type { Client } from '@/types';

// ---------------------------------------------------------------------------
// Cuentas vinculadas.
//
// En el panel siguen siendo cuentas separadas —cada una con su calendario, su
// feed y sus números, porque son dos perfiles distintos de Instagram—, pero
// detrás hay una sola persona. Vinculadas, con un solo link puede pasar de una
// a la otra.
//
// El vínculo es un grupo, no un par: si A está con B y después B con C, las
// tres se ven entre sí. Se guarda el grupo completo en cada una, que es lo que
// evita tener que andar siguiendo relaciones para saber quién puede ver qué.
// ---------------------------------------------------------------------------

/** Todas las cuentas del grupo de una, incluida ella misma. */
export function grupoDe(clients: Client[], clienteId: string): string[] {
  const cliente = clients.find((c) => c.id === clienteId);
  if (!cliente) return [];
  const ids = new Set([clienteId, ...(cliente.vinculadas ?? [])]);
  return clients.filter((c) => ids.has(c.id)).map((c) => c.id);
}

/** Las otras cuentas de su grupo. */
export function vinculadasDe(clients: Client[], clienteId: string): Client[] {
  return grupoDe(clients, clienteId)
    .filter((id) => id !== clienteId)
    .map((id) => clients.find((c) => c.id === id)!)
    .filter(Boolean);
}

/**
 * Une los grupos de dos cuentas y devuelve la lista actualizada.
 *
 * Se unen los dos grupos enteros, no solo las dos cuentas: si A ya estaba con
 * B y se vincula A con C, lo natural es que C vea también a B. Cualquier otra
 * cosa dejaría a la misma persona con vínculos que dependen del orden en que
 * los hizo.
 */
export function vincular(clients: Client[], a: string, b: string): Client[] {
  if (a === b) return clients;
  const grupo = new Set([...grupoDe(clients, a), ...grupoDe(clients, b)]);
  if (grupo.size < 2) return clients;

  return clients.map((c) =>
    grupo.has(c.id)
      ? { ...c, vinculadas: [...grupo].filter((id) => id !== c.id) }
      : c
  );
}

/**
 * Saca una cuenta de su grupo.
 *
 * Las demás quedan vinculadas entre sí: sacar a una no tiene por qué deshacer
 * el vínculo de las otras.
 */
export function desvincular(clients: Client[], clienteId: string): Client[] {
  const resto = grupoDe(clients, clienteId).filter((id) => id !== clienteId);

  return clients.map((c) => {
    if (c.id === clienteId) return { ...c, vinculadas: [] };
    if (!resto.includes(c.id)) return c;
    return { ...c, vinculadas: resto.filter((id) => id !== c.id) };
  });
}

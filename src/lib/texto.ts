/**
 * Plurales escritos como los diría una persona.
 *
 * Existe para no volver a escribir "1 comentario(s)": el paréntesis se le nota
 * a cualquiera que abra la app, y lo que ve el cliente es la carta de
 * presentación del trabajo.
 */
export function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Igual, pero sin repetir el número: "comentario" / "comentarios". */
export function palabra(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/**
 * El copy listo para pegar en Instagram.
 *
 * Los hashtags van pegados abajo, separados por un renglón en blanco, porque
 * es como se publican: no son un campo aparte en Instagram, son parte del
 * mismo texto. Copiar solo el copy obligaría a copiar los hashtags por
 * separado y acordarse de dejar el espacio.
 */
export function copyParaPegar(p: { copy: string; hashtags?: string[] }): string {
  const tags = p.hashtags?.length ? `\n\n${p.hashtags.map((h) => `#${h}`).join(' ')}` : '';
  return `${p.copy}${tags}`.trim();
}

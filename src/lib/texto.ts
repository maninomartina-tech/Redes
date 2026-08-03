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

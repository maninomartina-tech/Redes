import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Qué día es hoy, mientras la app está abierta.
//
// `new Date()` se lee una sola vez, cuando la pantalla se dibuja. Alcanza si
// alguien entra, mira y cierra; no alcanza acá. La app se deja abierta en una
// pestaña toda la semana, y en el teléfono la pantalla de inicio no la vuelve
// a cargar: el sistema la congela y la despierta igual a como quedó. Así, el
// calendario podía seguir marcando como "hoy" el día que ella lo abrió, y
// "atrasado" o "para hoy" contaban contra esa fecha vieja.
//
// Por eso el día se vuelve a mirar en dos momentos: cuando pasa la medianoche
// —con la app abierta— y cuando la app vuelve a la vista, que es lo que pasa
// en el teléfono, donde el reloj de la pestaña dormida no corre.
// ---------------------------------------------------------------------------

/** El día, sin la hora: dos fechas del mismo día dan la misma clave. */
export const claveDelDia = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * La fecha de hoy, que se actualiza sola.
 *
 * El objeto no cambia mientras no cambie el día, así que sirve de dependencia
 * de un `useMemo` sin recalcular en cada dibujo. Como contrapartida, su hora
 * es la del momento en que se notó el cambio de día: para comparar horarios
 * hay que leer `new Date()` adentro del cálculo y usar esto solo para que el
 * cálculo se rehaga.
 */
export function useHoy(): Date {
  const [hoy, setHoy] = useState(() => new Date());

  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout>;

    const revisar = () => {
      const ahora = new Date();
      // Se cambia el objeto solo si de verdad cambió el día: si no, cada vez
      // que la app vuelve a la vista se rehacen todos los cálculos de arriba.
      setHoy((antes) => (claveDelDia(antes) === claveDelDia(ahora) ? antes : ahora));
      programar();
    };

    const programar = () => {
      clearTimeout(reloj);
      const ahora = new Date();
      const medianoche = new Date(ahora);
      medianoche.setHours(24, 0, 0, 0);
      // Un segundo de más: un reloj que salta un instante antes de las doce
      // volvería a leer el día viejo y se quedaría esperando otras 24 horas.
      reloj = setTimeout(revisar, medianoche.getTime() - ahora.getTime() + 1000);
    };

    programar();
    document.addEventListener('visibilitychange', revisar);
    window.addEventListener('focus', revisar);
    // Volver con la flecha "atrás" restaura la página tal cual estaba.
    window.addEventListener('pageshow', revisar);

    return () => {
      clearTimeout(reloj);
      document.removeEventListener('visibilitychange', revisar);
      window.removeEventListener('focus', revisar);
      window.removeEventListener('pageshow', revisar);
    };
  }, []);

  return hoy;
}

/**
 * El mes —o la semana— que está mirando un calendario.
 *
 * Se puede mover con las flechas, y eso manda: si ella se fue a ver octubre,
 * no se le mueve la pantalla abajo del dedo. Pero cuando cambia el día
 * —a la medianoche, o al volver a abrir la app dos días después— el calendario
 * vuelve solo a donde estamos parados hoy.
 *
 * `dondeCae` dice qué es un ancla en ese calendario: el primero del mes en uno
 * mensual, el día mismo en uno semanal.
 */
export function useAncla(dondeCae: (hoy: Date) => Date) {
  const hoy = useHoy();

  const calcular = useRef(dondeCae);
  calcular.current = dondeCae;

  const [ancla, setAncla] = useState(() => calcular.current(hoy));

  const dia = claveDelDia(hoy);
  const ultimoDia = useRef(dia);

  useEffect(() => {
    if (ultimoDia.current === dia) return;
    ultimoDia.current = dia;
    setAncla(calcular.current(hoy));
  }, [dia, hoy]);

  return { hoy, ancla, setAncla };
}

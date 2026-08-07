import {
  BarChart3,
  Heart,
  Link2,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UserPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import { adStatusChip, money, nfmt, platformLabel } from '@/lib/format';
import { addDays, fmt } from '@/lib/date';
import { EmptyState, Modal, SectionTitle, Stat } from '@/components/ui';
import SyncButton from '@/components/SyncButton';
import { cambiarEstadoEnMeta, cambiarPresupuestoEnMeta, sincronizarAds } from '@/lib/sync';
import type { Ad, AdStatus, Platform } from '@/types';

// ---------------------------------------------------------------------------
// ADS · Publicidad paga.
//
// Todo se carga a mano: se crea la campaña con lo que se sabe al arrancar
// —presupuesto por día y cuántos días dura— y cuando termina se cargan los
// resultados que muestra Instagram al final de la promoción.
//
// Cuando la cuenta está conectada a Meta, las campañas se pueden traer de ahí.
// Esas además se prenden, se apagan y se les cambia el presupuesto desde acá, y
// el cambio viaja a Meta de verdad. Las cargadas a mano no: no existen allá.
// ---------------------------------------------------------------------------

const ESTADOS: AdStatus[] = ['activa', 'pausada', 'finalizada'];

const OBJETIVOS = [
  'Más visitas al perfil',
  'Más mensajes',
  'Más visitas al sitio web',
  'Más seguidores',
  'Interacción',
];

/** La interacción, como la muestra Instagram: me gusta, guardados y compartidos. */
export function interaccionDeLaCampana(a: Ad): number {
  return (a.likes ?? 0) + (a.saves ?? 0) + (a.shares ?? 0);
}

/** ¿Ya se le cargó algún resultado? */
function tieneResultados(a: Ad): boolean {
  return (
    a.views != null ||
    a.likes != null ||
    a.saves != null ||
    a.shares != null ||
    a.profileActivity != null ||
    a.newFollowers != null ||
    a.spend > 0
  );
}

export default function Ads() {
  const { ads, currentClientId, addAd, updateAd, removeAd, upsertAdExterno } = useStore();
  const sesion = useStore((s) => s.sesion);
  const client = useCurrentClient();
  const clientAds = ads.filter((a) => a.clientId === currentClientId);

  const [nueva, setNueva] = useState(false);
  /** La campaña que se está editando, y en qué pestaña se abrió. */
  const [editando, setEditando] = useState<Ad | null>(null);
  const [resultados, setResultados] = useState<Ad | null>(null);
  /** Lo que Meta rechazó, para decirlo en vez de dejar la tarjeta mintiendo. */
  const [aviso, setAviso] = useState<string | null>(null);

  const cuentaMeta = client.accounts.find((a) => a.metaAccountId)?.metaAccountId;

  /** ¿Este cambio se puede mandar a Meta? Solo si la campaña vino de ahí. */
  const enMeta = (ad: Ad) => Boolean(ad.externalId && cuentaMeta && sesion);

  /**
   * Cambia el estado.
   *
   * Si la campaña vive en Meta, manda el cambio y se queda con el estado que
   * Meta devuelve —no con el que se pidió—, porque puede quedar en otro: una
   * campaña terminada no se reactiva, y un método de pago rechazado la deja
   * apagada igual. Si falla, no se toca nada y se muestra el motivo.
   */
  const cambiarEstado = async (ad: Ad, status: AdStatus) => {
    setAviso(null);

    if (status === 'finalizada' || !enMeta(ad)) {
      updateAd(ad.id, { status });
      return;
    }

    const r = await cambiarEstadoEnMeta(
      cuentaMeta!,
      ad.externalId!,
      status as 'activa' | 'pausada',
      sesion!
    );
    if (!r.ok) {
      setAviso(r.error ?? 'Meta rechazó el cambio.');
      return;
    }
    updateAd(ad.id, { status: r.estado ?? status });
    if (r.estado && r.estado !== status) {
      setAviso(`Meta la dejó en "${r.estado}". Fijate en el Administrador de anuncios.`);
    }
  };

  /** Guarda la campaña editada y, si vive en Meta, le lleva el presupuesto. */
  const guardarCampana = async (ad: Ad, datos: Partial<Ad>) => {
    setAviso(null);
    updateAd(ad.id, datos);

    const nuevoDiario = datos.dailyBudget;
    if (!enMeta(ad) || nuevoDiario == null || nuevoDiario === ad.dailyBudget) return;

    const r = await cambiarPresupuestoEnMeta(
      cuentaMeta!,
      ad.externalId!,
      nuevoDiario,
      sesion!
    );
    if (!r.ok) {
      setAviso(r.error ?? 'Meta rechazó el presupuesto.');
      // Se vuelve al que tenía: en la app no puede figurar uno que Meta no aceptó.
      updateAd(ad.id, { dailyBudget: ad.dailyBudget });
      return;
    }
    if (r.diario != null && r.diario !== nuevoDiario) {
      updateAd(ad.id, { dailyBudget: r.diario });
      setAviso(`Meta lo dejó en ${money(r.diario)} por día.`);
    }
  };

  const total = useMemo(
    () =>
      clientAds.reduce(
        (acc, a) => ({
          gasto: acc.gasto + a.spend,
          views: acc.views + (a.views ?? 0),
          interaccion: acc.interaccion + interaccionDeLaCampana(a),
          seguidores: acc.seguidores + (a.newFollowers ?? 0),
        }),
        { gasto: 0, views: 0, interaccion: 0, seguidores: 0 }
      ),
    [clientAds]
  );

  const costoPorSeguidor = total.seguidores ? total.gasto / total.seguidores : 0;

  return (
    <div>
      <SectionTitle
        title="ADS · Publicidad paga"
        subtitle="Cargá cada campaña y sus resultados. No depende de Meta."
        action={
          <div className="flex flex-wrap items-start gap-2">
            <SyncButton
              label="Traer de Meta Ads"
              onSync={async () => {
                const cuenta = client.accounts.find((a) => a.metaAccountId);
                if (!cuenta?.metaAccountId) {
                  return {
                    ok: false,
                    error:
                      'Primero vinculá la cuenta de Instagram de este cliente, en la sección Cuentas.',
                  };
                }
                const r = await sincronizarAds(cuenta.metaAccountId, client.id);
                if (!r.ok) return { ok: false, error: r.error };
                r.datos.forEach((c) => upsertAdExterno(c));
                return {
                  ok: true,
                  resumen: `Se trajeron ${r.datos.length} campaña(s) desde Meta Ads.`,
                };
              }}
            />
            <button className="btn-primary" onClick={() => setNueva(true)}>
              <Plus size={16} /> Nueva campaña
            </button>
          </div>
        }
      />

      {clientAds.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={32} />}
          title="Sin campañas cargadas"
          hint="Cargá la campaña con el presupuesto por día y cuánto dura. Cuando termine, cargale los resultados que te muestra Instagram."
          action={
            <button className="btn-primary" onClick={() => setNueva(true)}>
              <Plus size={16} /> Nueva campaña
            </button>
          }
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Invertido" value={money(total.gasto)} />
            <Stat
              label="Visualizaciones"
              value={nfmt(total.views)}
              icon={<BarChart3 size={16} />}
            />
            <Stat
              label="Interacción"
              value={nfmt(total.interaccion)}
              hint="Me gusta, guardados y compartidos"
              icon={<Heart size={16} />}
            />
            <Stat
              label="Seguidores nuevos"
              value={`+${nfmt(total.seguidores)}`}
              hint={
                costoPorSeguidor > 0
                  ? `${money(Math.round(costoPorSeguidor))} cada uno`
                  : undefined
              }
              icon={<UserPlus size={16} />}
            />
          </div>

          {aviso && (
            <p className="mb-3 flex items-start gap-2 rounded-xl border border-butter-300 bg-butter-50 p-3 text-sm leading-snug text-ink-700">
              <TriangleAlert size={16} className="mt-px shrink-0 text-butter-600" />
              {aviso}
            </p>
          )}

          <div className="space-y-3">
            {clientAds.map((ad) => (
              <TarjetaDeCampana
                key={ad.id}
                ad={ad}
                enMeta={enMeta(ad)}
                onEstado={(status) => void cambiarEstado(ad, status)}
                onEditar={() => setEditando(ad)}
                onResultados={() => setResultados(ad)}
                onBorrar={() => removeAd(ad.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* aviso de conexión Meta Ads */}
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-ink-200/70 bg-ink-50 p-3.5 text-sm">
        <Link2 className="mt-0.5 shrink-0 text-ink-400" size={18} />
        <p className="text-ink-600">
          <span className="font-semibold text-ink-800">Conexión con Meta Ads:</span> con la
          cuenta vinculada y el id de la cuenta publicitaria en el servidor
          (<code className="rounded bg-ink-100 px-1 py-0.5 text-xs">META_AD_ACCOUNT_ID</code>),
          el botón <b>Traer de Meta Ads</b> completa estos números solo. Las campañas que
          lleguen así quedan marcadas con <b>Meta</b>: prenderlas, apagarlas o cambiarles
          el presupuesto diario desde acá las cambia también allá — para eso hace falta
          además <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">META_ADS_ESCRITURA=true</code>.
        </p>
      </div>

      <CampanaModal
        abierto={nueva || !!editando}
        ad={editando}
        onClose={() => {
          setNueva(false);
          setEditando(null);
        }}
        onGuardar={(datos) => {
          if (editando) void guardarCampana(editando, datos);
          else addAd({ ...datos, clientId: currentClientId, manual: true });
        }}
      />

      <ResultadosModal
        ad={resultados}
        onClose={() => setResultados(null)}
        onGuardar={(datos) => resultados && updateAd(resultados.id, datos)}
      />
    </div>
  );
}

/* ---------------------------- la tarjeta --------------------------------- */

function TarjetaDeCampana({
  ad,
  enMeta,
  onEstado,
  onEditar,
  onResultados,
  onBorrar,
}: {
  ad: Ad;
  /** Vive en Meta: prenderla o apagarla la cambia allá de verdad. */
  enMeta: boolean;
  onEstado: (s: AdStatus) => Promise<void> | void;
  onEditar: () => void;
  onResultados: () => void;
  onBorrar: () => void;
}) {
  const [mandando, setMandando] = useState(false);
  const presupuesto = ad.budget || (ad.dailyBudget ?? 0) * (ad.days ?? 0);
  const usado = presupuesto ? Math.min(100, (ad.spend / presupuesto) * 100) : 0;
  const interaccion = interaccionDeLaCampana(ad);
  const cargados = tieneResultados(ad);
  const porSeguidor = ad.newFollowers ? ad.spend / ad.newFollowers : 0;

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <Megaphone size={17} />
        </span>
        <div className="mr-auto min-w-0">
          <p className="truncate font-semibold text-ink-900">{ad.name}</p>
          <p className="truncate text-xs text-ink-400">
            {platformLabel[ad.platform]} · {ad.objective} · {fmt(ad.startDate, 'd MMM')}–
            {fmt(ad.endDate, 'd MMM')}
            {ad.days ? ` · ${ad.days} ${ad.days === 1 ? 'día' : 'días'}` : ''}
          </p>
        </div>

        {enMeta && (
          <span
            className="chip bg-sky-100 text-sky-700"
            title="Esta campaña está conectada con Meta Ads"
          >
            <Link2 size={12} /> Meta
          </span>
        )}

        {mandando && <Loader2 size={14} className="animate-spin text-ink-400" />}

        {/* El estado se cambia acá mismo: es lo que más se mira. */}
        <select
          value={ad.status}
          disabled={mandando}
          onChange={async (e) => {
            setMandando(true);
            await onEstado(e.target.value as AdStatus);
            setMandando(false);
          }}
          className={`chip cursor-pointer border-0 capitalize disabled:opacity-50 ${
            adStatusChip[ad.status]
          }`}
          aria-label={`Estado de ${ad.name}${enMeta ? ' (se cambia también en Meta)' : ''}`}
          title={
            enMeta
              ? 'Prenderla o apagarla la cambia también en Meta'
              : 'Cargada a mano: no existe en Meta'
          }
        >
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          className="text-ink-300 transition hover:text-brand-600"
          onClick={onEditar}
          title="Editar la campaña"
        >
          <Pencil size={15} />
        </button>
        <button
          className="text-ink-300 transition hover:text-rose-600"
          onClick={onBorrar}
          title="Borrar la campaña"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {cargados ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
            <Mini label="Visualizaciones" value={ad.views} />
            <Mini label="Me gusta" value={ad.likes} />
            <Mini label="Guardados" value={ad.saves} />
            <Mini label="Compartidos" value={ad.shares} />
            <Mini label="Actividad del perfil" value={ad.profileActivity} />
            <Mini
              label="Seguidores nuevos"
              value={ad.newFollowers}
              prefijo="+"
            />
          </div>

          {interaccion > 0 && (
            <p className="mt-2 text-xs text-ink-500">
              Interacción total: <b className="text-ink-700">{nfmt(interaccion)}</b>
              {porSeguidor > 0 && (
                <> · {money(Math.round(porSeguidor))} por seguidor nuevo</>
              )}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-500">
          Todavía no le cargaste resultados a esta campaña.
        </p>
      )}

      <div className="mt-3">
        <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-ink-500">
          <span>
            {money(ad.spend)} gastado{presupuesto > 0 && <> de {money(presupuesto)}</>}
          </span>
          {ad.dailyBudget ? <span>{money(ad.dailyBudget)} por día</span> : null}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${usado}%` }} />
        </div>
      </div>

      <button className="btn-outline mt-3 !py-1.5 text-xs" onClick={onResultados}>
        <BarChart3 size={14} /> {cargados ? 'Editar resultados' : 'Cargar resultados'}
      </button>
    </div>
  );
}

function Mini({
  label,
  value,
  prefijo = '',
}: {
  label: string;
  value?: number;
  prefijo?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className="font-semibold text-ink-800">
        {value == null ? <span className="text-ink-300">—</span> : `${prefijo}${nfmt(value)}`}
      </p>
    </div>
  );
}

/* ----------------------------- los modales ------------------------------- */

/** Campo numérico opcional: vacío quiere decir "todavía no lo sé". */
function Numero({
  id,
  label,
  valor,
  onChange,
  placeholder,
  ayuda,
}: {
  id: string;
  label: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ayuda?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-1"
        placeholder={placeholder ?? 'Opcional'}
      />
      {ayuda && <p className="mt-1 text-[11px] leading-snug text-ink-400">{ayuda}</p>}
    </div>
  );
}

const texto = (n?: number) => (n == null ? '' : String(n));
const numero = (t: string) => (t.trim() === '' ? undefined : Number(t));

/** Alta y edición de la campaña: lo que se sabe antes de que empiece. */
function CampanaModal({
  abierto,
  ad,
  onClose,
  onGuardar,
}: {
  abierto: boolean;
  ad: Ad | null;
  onClose: () => void;
  onGuardar: (datos: Partial<Ad>) => void;
}) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState(OBJETIVOS[0]);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [status, setStatus] = useState<AdStatus>('activa');
  const [dailyBudget, setDailyBudget] = useState('');
  const [days, setDays] = useState('');
  const [startDate, setStartDate] = useState('');
  const [cargado, setCargado] = useState<string | null>(null);

  const clave = ad?.id ?? (abierto ? 'nueva' : null);
  if (abierto && cargado !== clave) {
    setCargado(clave);
    setName(ad?.name ?? '');
    setObjective(ad?.objective ?? OBJETIVOS[0]);
    setPlatform(ad?.platform ?? 'instagram');
    setStatus(ad?.status ?? 'activa');
    setDailyBudget(texto(ad?.dailyBudget));
    setDays(texto(ad?.days));
    setStartDate((ad?.startDate ?? new Date().toISOString()).slice(0, 10));
  }

  const diario = numero(dailyBudget) ?? 0;
  const duracion = numero(days) ?? 0;
  const total = diario * duracion;

  const guardar = () => {
    const inicio = new Date(startDate + 'T12:00:00');
    onGuardar({
      name: name.trim() || 'Campaña sin nombre',
      objective,
      platform,
      status,
      dailyBudget: numero(dailyBudget),
      days: numero(days),
      budget: total,
      startDate: inicio.toISOString(),
      endDate: addDays(inicio, Math.max(0, duracion - 1)).toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      open={abierto}
      onClose={onClose}
      title={ad ? 'Editar campaña' : 'Nueva campaña de ADS'}
    >
      <div className="space-y-4 p-5">
        <div>
          <label className="label" htmlFor="ad-nombre">
            Nombre
          </label>
          <input
            id="ad-nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-1"
            placeholder="Ej: Promoción reel de septiembre"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ad-objetivo">
              Objetivo
            </label>
            <select
              id="ad-objetivo"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="input mt-1"
            >
              {[...new Set([objective, ...OBJETIVOS])].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ad-plataforma">
              Plataforma
            </label>
            <select
              id="ad-plataforma"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="input mt-1"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Numero
            id="ad-diario"
            label="Presupuesto diario"
            valor={dailyBudget}
            onChange={setDailyBudget}
            placeholder="Ej: 3000"
          />
          <Numero
            id="ad-dias"
            label="Duración (días)"
            valor={days}
            onChange={setDays}
            placeholder="Ej: 7"
          />
        </div>

        {total > 0 && (
          <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600">
            Presupuesto total: <b className="text-ink-800">{money(total)}</b>
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ad-inicio">
              Empieza el
            </label>
            <input
              id="ad-inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label" htmlFor="ad-estado">
              Estado
            </label>
            <select
              id="ad-estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as AdStatus)}
              className="input mt-1 capitalize"
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={guardar}>
            {ad ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Los resultados, en el mismo orden en que los muestra Instagram al final de
 * una promoción, para poder copiarlos de arriba a abajo sin buscar.
 */
function ResultadosModal({
  ad,
  onClose,
  onGuardar,
}: {
  ad: Ad | null;
  onClose: () => void;
  onGuardar: (datos: Partial<Ad>) => void;
}) {
  const [views, setViews] = useState('');
  const [likes, setLikes] = useState('');
  const [saves, setSaves] = useState('');
  const [shares, setShares] = useState('');
  const [profileActivity, setProfileActivity] = useState('');
  const [newFollowers, setNewFollowers] = useState('');
  const [spend, setSpend] = useState('');
  const [cargado, setCargado] = useState<string | null>(null);

  if (ad && cargado !== ad.id) {
    setCargado(ad.id);
    setViews(texto(ad.views));
    setLikes(texto(ad.likes));
    setSaves(texto(ad.saves));
    setShares(texto(ad.shares));
    setProfileActivity(texto(ad.profileActivity));
    setNewFollowers(texto(ad.newFollowers));
    setSpend(ad.spend ? String(ad.spend) : '');
  }

  const interaccion =
    (numero(likes) ?? 0) + (numero(saves) ?? 0) + (numero(shares) ?? 0);

  return (
    <Modal
      open={!!ad}
      onClose={onClose}
      title={ad ? `Resultados de ${ad.name}` : 'Resultados'}
    >
      <div className="space-y-4 p-5">
        <p className="text-sm leading-snug text-ink-500">
          Copiá los números tal como te los muestra Instagram al final de la promoción.
          Lo que no tengas, dejalo vacío.
        </p>

        <Numero
          id="res-views"
          label="Visualizaciones"
          valor={views}
          onChange={setViews}
          placeholder="Ej: 24500"
        />

        <div className="rounded-xl border border-ink-200/70 bg-ink-50/60 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Interacción
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <Numero id="res-likes" label="Me gusta" valor={likes} onChange={setLikes} />
            <Numero id="res-saves" label="Guardados" valor={saves} onChange={setSaves} />
            <Numero
              id="res-shares"
              label="Compartidos"
              valor={shares}
              onChange={setShares}
            />
          </div>
          {interaccion > 0 && (
            <p className="mt-2 text-[11px] text-ink-500">
              Total: <b className="text-ink-700">{nfmt(interaccion)}</b>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Numero
            id="res-perfil"
            label="Actividad del perfil"
            valor={profileActivity}
            onChange={setProfileActivity}
          />
          <Numero
            id="res-seguidores"
            label="Seguidores nuevos"
            valor={newFollowers}
            onChange={setNewFollowers}
          />
        </div>

        <Numero
          id="res-gasto"
          label="Gasto"
          valor={spend}
          onChange={setSpend}
          placeholder="Ej: 21000"
          ayuda="Lo que se gastó de verdad, que puede ser menos que el presupuesto."
        />

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onGuardar({
                views: numero(views),
                likes: numero(likes),
                saves: numero(saves),
                shares: numero(shares),
                profileActivity: numero(profileActivity),
                newFollowers: numero(newFollowers),
                spend: numero(spend) ?? 0,
              });
              onClose();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}

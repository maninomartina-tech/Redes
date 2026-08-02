import {
  CheckCircle2,
  Flag,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Lead, LeadSource, LeadStatus, MonthlyStat } from '@/types';
import { computeGrowth, computeLeads, monthLabel, sourceLabel } from '@/lib/growth';
import { money, nfmt } from '@/lib/format';
import { fmt } from '@/lib/date';
import { EmptyState, Modal, SectionTitle, Stat, Toggle } from '@/components/ui';
import SyncButton from '@/components/SyncButton';
import { sincronizarCuenta } from '@/lib/sync';

const leadStatusChip: Record<LeadStatus, string> = {
  nuevo: 'bg-sky-100 text-sky-600',
  contactado: 'bg-butter-100 text-butter-600',
  ganado: 'bg-mint-100 text-mint-600',
  perdido: 'bg-ink-100 text-ink-500',
};

const sources: LeadSource[] = ['whatsapp', 'dm', 'comentario', 'web', 'presencial', 'otro'];
const statuses: LeadStatus[] = ['nuevo', 'contactado', 'ganado', 'perdido'];

export default function Growth() {
  const client = useCurrentClient();
  const {
    monthlyStats,
    leads,
    posts,
    updateClient,
    removeMonthlyStat,
    updateLead,
    removeLead,
    upsertMonthlyStat,
  } = useStore();

  const growth = useMemo(
    () => computeGrowth(client, monthlyStats, posts),
    [client, monthlyStats, posts]
  );
  const leadsSummary = useMemo(() => computeLeads(leads, client.id), [leads, client.id]);

  const [statModal, setStatModal] = useState<MonthlyStat | 'nuevo' | null>(null);
  const [leadModal, setLeadModal] = useState<Lead | 'nuevo' | null>(null);
  const [baseModal, setBaseModal] = useState(false);

  const clientLeads = leads
    .filter((l) => l.clientId === client.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const clientStats = monthlyStats
    .filter((s) => s.clientId === client.id)
    .sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Crecimiento de la cuenta"
        subtitle="Cargá los números mes a mes. No depende de Meta, así que sirve para cualquier cuenta."
        action={
          <SyncButton
            descripcion="Trae seguidores, alcance e interacción. No toca las consultas ni las ventas."
            onSync={async () => {
              const cuenta = client.accounts.find((a) => a.metaAccountId);
              if (!cuenta?.metaAccountId) {
                return {
                  ok: false,
                  error:
                    'Primero vinculá la cuenta de Instagram de este cliente, en la sección Cuentas.',
                };
              }
              const r = await sincronizarCuenta(cuenta.metaAccountId, client.id);
              if (!r.ok) return { ok: false, error: r.error, avisos: r.avisos };
              r.datos.forEach((m) => upsertMonthlyStat(m));
              return {
                ok: true,
                resumen: `Se actualizaron ${r.datos.length} mes(es) con los datos de Meta.`,
                avisos: r.avisos,
              };
            }}
          />
        }
      />

      {/* punto de partida */}
      <div className="card flex flex-wrap items-center gap-4 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600">
          <Flag size={18} />
        </span>
        <div className="mr-auto">
          <p className="font-semibold text-ink-900">Punto de partida</p>
          {client.startingFollowers != null ? (
            <p className="text-sm text-ink-500">
              Empezaste con <b className="text-ink-700">{nfmt(client.startingFollowers)}</b>{' '}
              seguidores
              {client.startDate && <> el {fmt(client.startDate, "d 'de' MMMM 'de' yyyy")}</>}.
            </p>
          ) : (
            <p className="text-sm text-ink-500">
              Cargá cuántos seguidores tenía la cuenta cuando la tomaste.
            </p>
          )}
        </div>
        <button className="btn-outline" onClick={() => setBaseModal(true)}>
          <Pencil size={15} /> Editar
        </button>
      </div>

      {/* resumen */}
      {growth.hasBaseline && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Seguidores hoy"
            value={nfmt(growth.currentFollowers)}
            icon={<Users size={16} />}
          />
          <Stat
            label="Ganados desde el inicio"
            value={`+${nfmt(growth.gained)}`}
            hint={`${growth.gainedPct.toFixed(0)}% de crecimiento`}
            icon={<TrendingUp size={16} />}
          />
          <Stat
            label="Promedio por mes"
            value={`+${Math.round(growth.avgPerMonth)}`}
            hint={`${growth.monthsTracked} meses cargados`}
          />
          <Stat
            label="Interacción vs. inicio"
            value={
              growth.interactionsGrowthPct >= 0
                ? `+${growth.interactionsGrowthPct.toFixed(0)}%`
                : `${growth.interactionsGrowthPct.toFixed(0)}%`
            }
            hint={`${nfmt(growth.interactionsLast)} este mes`}
          />
        </div>
      )}

      {/* carga mensual */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-ink-900">Registro mensual</h3>
            <p className="text-sm text-ink-500">
              Un renglón por mes: seguidores al cierre e interacción.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setStatModal('nuevo')}>
            <Plus size={16} /> Cargar mes
          </button>
        </div>

        {clientStats.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={30} />}
            title="Todavía no cargaste ningún mes"
            hint="Cargá los seguidores al cierre de cada mes y vas a ver la evolución de la cuenta."
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-ink-200/70 bg-ink-50 text-left">
                  <tr className="text-[11px] uppercase tracking-wider text-ink-400">
                    <th className="px-4 py-2.5 font-semibold">Mes</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Seguidores</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Ganados</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Interacción</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Alcance</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {clientStats.map((s) => {
                    const punto = growth.points.find((p) => p.month === s.month);
                    return (
                      <tr key={s.id} className="border-b border-ink-200/50 last:border-0">
                        <td className="px-4 py-2.5 font-medium capitalize text-ink-800">
                          {monthLabel(s.month)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-ink-800">
                          {nfmt(s.followers)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className={
                              (punto?.gained ?? 0) >= 0 ? 'text-mint-600' : 'text-rose-600'
                            }
                          >
                            {(punto?.gained ?? 0) >= 0 ? '+' : ''}
                            {punto?.gained ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-ink-700">
                          {nfmt(punto?.interactions ?? 0)}
                          {punto?.interactionsEstimated && (
                            <span className="ml-1 text-[10px] text-ink-400" title="Calculado con los posts publicados">
                              est.
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-ink-700">
                          {s.reach ? nfmt(s.reach) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            className="text-ink-300 transition hover:text-brand-600"
                            onClick={() => setStatModal(s)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="ml-2 text-ink-300 transition hover:text-rose-600"
                            onClick={() => removeMonthlyStat(s.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* leads / ventas */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-ink-900">Consultas y ventas</h3>
            <p className="text-sm text-ink-500">
              Cargá acá lo que llega por WhatsApp o DM y marcá lo que se concretó.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-600">
              Este cliente mide ventas
              <Toggle
                checked={!!client.tracksLeads}
                onChange={(v) => updateClient(client.id, { tracksLeads: v })}
              />
            </label>
            <button className="btn-primary" onClick={() => setLeadModal('nuevo')}>
              <Plus size={16} /> Nueva consulta
            </button>
          </div>
        </div>

        {!client.tracksLeads && (
          <p className="mb-3 rounded-xl border border-butter-200 bg-butter-50 p-3 text-sm text-ink-700">
            Con el interruptor apagado, el cliente <b>no ve</b> el bloque de ventas en sus
            resultados. Igual podés cargar consultas para tu propio seguimiento.
          </p>
        )}

        {clientLeads.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={30} />}
            title="Sin consultas cargadas"
            hint="Cada vez que te escriban por WhatsApp o DM por una publicación, cargalo acá."
          />
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Consultas" value={leadsSummary.total} />
              <Stat
                label="Concretadas"
                value={leadsSummary.ganados}
                hint={`${leadsSummary.conversion.toFixed(0)}% de conversión`}
                icon={<CheckCircle2 size={16} />}
              />
              <Stat label="Facturado" value={money(leadsSummary.revenue)} />
              <Stat label="Ticket promedio" value={money(Math.round(leadsSummary.ticketPromedio))} />
            </div>

            <div className="card divide-y divide-ink-200/60">
              {clientLeads.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <div className="mr-auto min-w-0">
                    <p className="font-medium text-ink-900">{l.name}</p>
                    <p className="text-xs text-ink-400">
                      {sourceLabel(l.source)} · {fmt(l.date, "d 'de' MMM")}
                      {l.note && <> · {l.note}</>}
                    </p>
                  </div>
                  {l.amount ? (
                    <span className="text-sm font-semibold tabular-nums text-ink-800">
                      {money(l.amount)}
                    </span>
                  ) : null}
                  <select
                    value={l.status}
                    onChange={(e) => updateLead(l.id, { status: e.target.value as LeadStatus })}
                    className={`chip cursor-pointer border-0 ${leadStatusChip[l.status]}`}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    className="text-ink-300 transition hover:text-brand-600"
                    onClick={() => setLeadModal(l)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="text-ink-300 transition hover:text-rose-600"
                    onClick={() => removeLead(l.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BaselineModal open={baseModal} onClose={() => setBaseModal(false)} />
      <StatModal stat={statModal} onClose={() => setStatModal(null)} />
      <LeadModal lead={leadModal} onClose={() => setLeadModal(null)} />
    </div>
  );
}

/* ---------------- Modales de carga ---------------- */

function BaselineModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const client = useCurrentClient();
  const updateClient = useStore((s) => s.updateClient);
  const [followers, setFollowers] = useState(String(client.startingFollowers ?? ''));
  const [date, setDate] = useState((client.startDate ?? new Date().toISOString()).slice(0, 10));

  return (
    <Modal open={open} onClose={onClose} title="Punto de partida">
      <div className="space-y-4 p-5">
        <p className="text-sm text-ink-500">
          Estos dos datos son los que permiten mostrarle al cliente cuánto creció la cuenta
          desde que la llevás vos.
        </p>
        <div>
          <label className="label">Seguidores al empezar</label>
          <input
            type="number"
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            className="input mt-1"
            placeholder="Ej: 1840"
          />
        </div>
        <div>
          <label className="label">Fecha en que tomaste la cuenta</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              updateClient(client.id, {
                startingFollowers: Number(followers) || 0,
                startDate: new Date(date + 'T12:00:00').toISOString(),
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

function StatModal({
  stat,
  onClose,
}: {
  stat: MonthlyStat | 'nuevo' | null;
  onClose: () => void;
}) {
  const client = useCurrentClient();
  const upsert = useStore((s) => s.upsertMonthlyStat);
  const editando = stat && stat !== 'nuevo' ? stat : null;

  const [month, setMonth] = useState('');
  const [followers, setFollowers] = useState('');
  const [interactions, setInteractions] = useState('');
  const [reach, setReach] = useState('');
  const [cargado, setCargado] = useState<string | null>(null);

  // Rellena el formulario cuando cambia lo que se está editando.
  const claveActual = editando?.id ?? (stat === 'nuevo' ? 'nuevo' : null);
  if (stat && cargado !== claveActual) {
    setCargado(claveActual);
    setMonth(editando?.month ?? new Date().toISOString().slice(0, 7));
    setFollowers(editando ? String(editando.followers) : '');
    setInteractions(editando?.interactions != null ? String(editando.interactions) : '');
    setReach(editando?.reach != null ? String(editando.reach) : '');
  }

  return (
    <Modal
      open={!!stat}
      onClose={onClose}
      title={editando ? 'Editar mes' : 'Cargar mes'}
    >
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Mes</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">Seguidores al cierre</label>
            <input
              type="number"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              className="input mt-1"
              placeholder="Ej: 4180"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Interacciones del mes</label>
            <input
              type="number"
              value={interactions}
              onChange={(e) => setInteractions(e.target.value)}
              className="input mt-1"
              placeholder="Opcional"
            />
            <p className="mt-1 text-[11px] text-ink-400">
              Si lo dejás vacío se calcula con los posts publicados.
            </p>
          </div>
          <div>
            <label className="label">Alcance del mes</label>
            <input
              type="number"
              value={reach}
              onChange={(e) => setReach(e.target.value)}
              className="input mt-1"
              placeholder="Opcional"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!month || !followers}
            onClick={() => {
              upsert({
                id: editando?.id,
                clientId: client.id,
                month,
                followers: Number(followers) || 0,
                interactions: interactions === '' ? undefined : Number(interactions),
                reach: reach === '' ? undefined : Number(reach),
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

function LeadModal({ lead, onClose }: { lead: Lead | 'nuevo' | null; onClose: () => void }) {
  const client = useCurrentClient();
  const { addLead, updateLead } = useStore();
  const editando = lead && lead !== 'nuevo' ? lead : null;

  const [name, setName] = useState('');
  const [source, setSource] = useState<LeadSource>('whatsapp');
  const [status, setStatus] = useState<LeadStatus>('nuevo');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [cargado, setCargado] = useState<string | null>(null);

  const claveActual = editando?.id ?? (lead === 'nuevo' ? 'nuevo' : null);
  if (lead && cargado !== claveActual) {
    setCargado(claveActual);
    setName(editando?.name ?? '');
    setSource(editando?.source ?? 'whatsapp');
    setStatus(editando?.status ?? 'nuevo');
    setAmount(editando?.amount != null ? String(editando.amount) : '');
    setDate((editando?.date ?? new Date().toISOString()).slice(0, 10));
    setNote(editando?.note ?? '');
  }

  const guardar = () => {
    const datos = {
      clientId: client.id,
      name: name.trim() || 'Consulta sin nombre',
      source,
      status,
      amount: amount === '' ? undefined : Number(amount),
      date: new Date(date + 'T12:00:00').toISOString(),
      note: note.trim() || undefined,
    };
    if (editando) updateLead(editando.id, datos);
    else addLead(datos);
    onClose();
  };

  return (
    <Modal open={!!lead} onClose={onClose} title={editando ? 'Editar consulta' : 'Nueva consulta'}>
      <div className="space-y-4 p-5">
        <div>
          <label className="label">Nombre o referencia</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-1"
            placeholder="Ej: Carolina M."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Llegó por</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="input mt-1"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="input mt-1"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Monto de la venta</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input mt-1"
              placeholder="Solo si se concretó"
            />
          </div>
        </div>
        <div>
          <label className="label">Nota</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input mt-1"
            placeholder="Ej: vino por el reel de detrás de escena"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={guardar}>
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}

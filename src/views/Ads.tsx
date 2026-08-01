import { Megaphone, Plus, Link2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { analyzeAds } from '@/lib/ai';
import { adStatusChip, money, nfmt, pct, platformLabel } from '@/lib/format';
import { fmt } from '@/lib/date';
import { EmptyState, Modal, SectionTitle, Stat } from '@/components/ui';
import type { AdStatus, Platform } from '@/types';

export default function Ads() {
  const { ads, currentClientId, addAd } = useStore();
  const clientAds = ads.filter((a) => a.clientId === currentClientId);
  const analysis = useMemo(() => analyzeAds(clientAds), [clientAds]);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <SectionTitle
        title="ADS · Publicidad paga"
        subtitle="Seguimiento de las campañas pagas y su rendimiento."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Nueva campaña
          </button>
        }
      />

      {/* aviso de conexión Meta Ads */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-sm">
        <Link2 className="mt-0.5 shrink-0 text-brand-600" size={18} />
        <p className="text-ink-700">
          <span className="font-semibold">Conexión con Meta Ads:</span> los datos se cargan de
          ejemplo. Cuando conectes tu cuenta de <b>Meta Ads Manager</b> (Marketing API), las
          campañas y su gasto se van a sincronizar solas acá.
        </p>
      </div>

      {clientAds.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={32} />}
          title="Sin campañas de ADS"
          hint="Creá una campaña para hacer seguimiento del presupuesto y los resultados."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Inversión total" value={money(analysis.totalSpend)} />
            <Stat label="Resultados" value={nfmt(analysis.totalConversions)} />
            <Stat label="Costo por resultado" value={money(Math.round(analysis.cpa))} />
            <Stat label="CTR" value={pct(analysis.ctr)} />
          </div>

          {analysis.insights.length > 0 && (
            <div className="card mb-4 space-y-2 p-4">
              <h3 className="font-bold text-ink-800">Lectura rápida</h3>
              {analysis.insights.map((ins, i) => (
                <p key={i} className="text-sm text-ink-600">
                  <span className="font-semibold text-ink-800">{ins.title}.</span> {ins.detail}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {clientAds.map((ad) => {
              const usedPct = ad.budget ? Math.min(100, (ad.spend / ad.budget) * 100) : 0;
              const cpa = ad.conversions ? ad.spend / ad.conversions : 0;
              const ctr = ad.impressions ? (ad.clicks / ad.impressions) * 100 : 0;
              return (
                <div key={ad.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <Megaphone size={17} />
                    </span>
                    <div className="mr-auto">
                      <p className="font-semibold text-ink-900">{ad.name}</p>
                      <p className="text-xs text-ink-400">
                        {platformLabel[ad.platform]} · {ad.objective} ·{' '}
                        {fmt(ad.startDate, 'd MMM')}–{fmt(ad.endDate, 'd MMM')}
                      </p>
                    </div>
                    <span className={`chip ${adStatusChip[ad.status]}`}>{ad.status}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                    <Mini label="Impresiones" value={nfmt(ad.impressions)} />
                    <Mini label="Clics" value={nfmt(ad.clicks)} />
                    <Mini label="Resultados" value={nfmt(ad.conversions)} />
                    <Mini label="CTR" value={pct(ctr)} />
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-ink-500">
                      <span>
                        {money(ad.spend)} de {money(ad.budget)}
                      </span>
                      <span>Costo/resultado: {money(Math.round(cpa))}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <NewAdModal open={open} onClose={() => setOpen(false)} onCreate={(a) => addAd({ ...a, clientId: currentClientId })} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className="font-semibold text-ink-800">{value}</p>
    </div>
  );
}

function NewAdModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (a: { name: string; objective: string; platform: Platform; budget: number; status: AdStatus }) => void;
}) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('Alcance');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [budget, setBudget] = useState(20000);

  return (
    <Modal open={open} onClose={onClose} title="Nueva campaña de ADS">
      <div className="space-y-4 p-5">
        <div>
          <label className="label">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" placeholder="Ej: Leads DM · Reel autoridad" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Objetivo</label>
            <select value={objective} onChange={(e) => setObjective(e.target.value)} className="input mt-1">
              {['Alcance', 'Tráfico', 'Mensajes', 'Conversiones', 'Interacción'].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Plataforma</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className="input mt-1">
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Presupuesto (ARS)</label>
          <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="input mt-1" />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => {
              onCreate({ name: name.trim() || 'Nueva campaña', objective, platform, budget, status: 'activa' });
              setName('');
              onClose();
            }}
          >
            Crear
          </button>
        </div>
      </div>
    </Modal>
  );
}

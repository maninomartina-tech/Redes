import { Camera, Link2, Music2, ShieldCheck, Users } from 'lucide-react';
import { useStore, useCurrentClient } from '@/store/useStore';
import type { Platform } from '@/types';
import { platformLabel } from '@/lib/format';
import { SectionTitle, Toggle } from '@/components/ui';

const platformIcon: Record<Platform, React.ReactNode> = {
  instagram: <Camera size={20} />,
  facebook: <Users size={20} />,
  tiktok: <Music2 size={20} />,
};

export default function Accounts() {
  const client = useCurrentClient();
  const toggleAccount = useStore((s) => s.toggleAccount);

  return (
    <div>
      <SectionTitle
        title="Cuentas conectadas"
        subtitle={`Conexiones de ${client.name} para publicar automáticamente.`}
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
        <ShieldCheck className="mt-0.5 shrink-0 text-brand-600" size={20} />
        <div className="text-ink-700">
          <p className="font-semibold text-ink-800">Cómo funciona la publicación automática</p>
          <p className="mt-1">
            Para publicar solo en Instagram/Facebook se usa la <b>Graph API de Meta</b>{' '}
            (Instagram Content Publishing). Requiere una app de Meta aprobada y cuentas
            Business/Creator. Al conectar acá, la app agenda cada pieza y la publica el día
            programado. Mientras tanto, la conexión funciona en modo demo.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {client.accounts.map((acc) => (
          <div key={acc.id} className="card flex items-center gap-4 p-4">
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl ${
                acc.connected ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'
              }`}
            >
              {platformIcon[acc.platform]}
            </span>
            <div className="mr-auto">
              <p className="font-semibold text-ink-900">{platformLabel[acc.platform]}</p>
              <p className="text-sm text-ink-500">{acc.handle}</p>
            </div>
            <span
              className={`chip ${
                acc.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'
              }`}
            >
              {acc.connected ? 'Conectada' : 'Desconectada'}
            </span>
            <Toggle checked={acc.connected} onChange={() => toggleAccount(client.id, acc.id)} />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-ink-400">
        <Link2 size={15} />
        Próximamente: conexión directa con Meta, TikTok Business y programación nativa de reels,
        carruseles e historias.
      </div>
    </div>
  );
}

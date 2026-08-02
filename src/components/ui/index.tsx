import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useMediaUrl } from '@/lib/media';

export function Avatar({
  name,
  color,
  size = 36,
  logoId,
}: {
  name: string;
  color?: string;
  size?: number;
  /** Si el cliente tiene logo subido, se muestra en lugar de las iniciales. */
  logoId?: string;
}) {
  const logo = useMediaUrl(logoId);

  const initials = name
    .replace(/[@]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className="shrink-0 rounded-full bg-surface object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: color ?? '#7A4A3F',
      }}
    >
      {initials}
    </div>
  );
}

export function MediaThumb({
  src,
  kind,
  className = '',
  label,
}: {
  src?: string;
  kind?: 'image' | 'video';
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-ink-100 ${className}`}
      style={src ? { background: src } : undefined}
    >
      {label && (
        <span className="absolute left-2 top-2 rounded-md bg-ink-900/45 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {label}
        </span>
      )}
      {kind === 'video' && (
        <span className="absolute inset-0 grid place-items-center text-white/90">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-900/35 backdrop-blur-sm">
            ▶
          </span>
        </span>
      )}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon && <span className="text-ink-400">{icon}</span>}
      </div>
      <div className="mt-1 text-2xl font-bold text-ink-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-ink-200 bg-surface/60 py-14 text-center">
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <p className="font-semibold text-ink-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
  title,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/25 p-4 backdrop-blur-sm sm:p-8">
      <div
        className={`card my-4 w-full ${wide ? 'max-w-5xl' : 'max-w-lg'} animate-[fadeIn_.15s_ease]`}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-3.5">
            <h3 className="font-bold text-ink-900">{title}</h3>
            <button className="btn-ghost -mr-2 px-2" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? 'bg-brand-800' : 'bg-ink-200'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

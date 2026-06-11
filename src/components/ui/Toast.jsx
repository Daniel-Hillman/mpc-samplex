import { X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

const VARIANT_COLOR = {
  info: 'var(--color-info)',
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  warning: 'var(--color-warning)',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto flex items-center gap-3 rounded-md border py-2.5 pl-3 pr-2"
          style={{
            background: 'var(--color-surface-2)',
            borderColor: 'var(--color-border-bright)',
            borderLeft: `3px solid ${VARIANT_COLOR[t.variant] || VARIANT_COLOR.info}`,
            minWidth: 260,
            maxWidth: 380,
          }}
        >
          <span className="flex-1 font-mono text-sm text-text-primary">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="rounded p-1 text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

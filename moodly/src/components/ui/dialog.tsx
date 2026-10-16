'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export function Dialog({ open, onClose, title, children, drawer = false, className = '' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; drawer?: boolean; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow; document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('button, input, a[href]')?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = scroll; document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [open]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<div className={cn('fixed inset-0 z-[100] flex', drawer ? 'justify-end' : 'items-center justify-center p-4')}>
    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade" onClick={onClose} aria-hidden="true" />
    <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className={cn('relative flex w-full flex-col bg-white shadow-2xl', drawer ? 'h-[100dvh] max-w-[480px] animate-drawer' : 'max-h-[90dvh] max-w-2xl animate-fade-up', className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <h2 className="text-lg font-extrabold uppercase tracking-tight">{title}</h2><button className="icon-button -mr-2" onClick={onClose} aria-label={`Close ${title}`}><X size={20} strokeWidth={1.5} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  </div>, document.body);
}

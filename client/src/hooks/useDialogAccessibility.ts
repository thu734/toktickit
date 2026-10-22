import { useEffect, useRef } from 'react';

// Preserve the existing dialog markup and operations while sharing keyboard
// containment, background exclusion and opener restoration across dialogs.
export function useDialogAccessibility(open: boolean, onDismiss: () => void, restorationTarget?: () => HTMLElement | null) {
  const ref = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const restore = useRef(restorationTarget);
  restore.current = restorationTarget;
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backgrounds: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = dialog;
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          backgrounds.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'
    )).filter(element => !element.closest('[hidden], [inert]') && element.getAttribute('aria-hidden') !== 'true');
    const initial = dialog.querySelector<HTMLElement>('[data-dialog-initial], input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled)');
    (initial || controls()[0] || dialog).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss.current(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const keepFocus = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) (controls()[0] || dialog).focus();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', keepFocus);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', keepFocus);
      backgrounds.forEach(({ element, inert }) => { element.inert = inert; });
      const target = restore.current?.() || opener;
      if (target?.isConnected) target.focus();
    };
  }, [open]);
  return ref;
}

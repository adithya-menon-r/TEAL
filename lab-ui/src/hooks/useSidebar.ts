import { useCallback, useEffect, useState } from 'react';

const NARROW_QUERY = '(max-width: 767.98px)';

/** Phone-only drawer state. On desktop the sidebar is always visible. */
export function useSidebar() {
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = () => {
      setIsNarrow(mq.matches);
      setOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  // Esc closes the drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return { open, isNarrow, toggle, close };
}

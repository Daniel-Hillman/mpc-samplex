import { create } from 'zustand';

let nextId = 1;

export const useToastStore = create((set) => ({
  toasts: [],
  push: (message, variant = 'info') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, variant }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper usable outside React components. */
export const toast = {
  info: (msg) => useToastStore.getState().push(msg, 'info'),
  success: (msg) => useToastStore.getState().push(msg, 'success'),
  error: (msg) => useToastStore.getState().push(msg, 'error'),
  warning: (msg) => useToastStore.getState().push(msg, 'warning'),
};

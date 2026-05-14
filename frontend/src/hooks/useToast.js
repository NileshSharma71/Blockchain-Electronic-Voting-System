import { useState, useEffect, useCallback } from 'react';

let toastId = 0;

// Global toast state — simple singleton approach without context
const listeners = new Set();
let toasts = [];

function notify(listeners, newToasts) {
  toasts = newToasts;
  listeners.forEach(fn => fn([...newToasts]));
}

export function showToast(message, type = 'success', duration = 4000) {
  const id = ++toastId;
  notify(listeners, [...toasts, { id, message, type }]);
  setTimeout(() => {
    notify(listeners, toasts.filter(t => t.id !== id));
  }, duration);
}

export function useToasts() {
  const [list, setList] = useState([]);
  useEffect(() => {
    listeners.add(setList);
    return () => listeners.delete(setList);
  }, []);
  const dismiss = useCallback((id) => {
    notify(listeners, toasts.filter(t => t.id !== id));
  }, []);
  return { list, dismiss };
}

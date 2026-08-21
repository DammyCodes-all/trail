import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scheduleIdle(
  cb: () => void,
  opts?: { timeout: number },
): () => void {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = opts ? w.requestIdleCallback(cb, opts) : w.requestIdleCallback(cb);
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 0);
  return () => window.clearTimeout(id);
}

export function yieldToIdle(): Promise<void> {
  return new Promise<void>((resolve) => {
    scheduleIdle(() => resolve());
  });
}

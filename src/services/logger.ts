export const log = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log('[mrless]', ...args);
};

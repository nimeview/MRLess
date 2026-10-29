export function fmtTime(ts: number) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const KB = 1024;
const MB = 1024 * 1024;

/** Human size for transfer limits (e.g. "8 MB", "32 KB"). */
export function fmtSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes >= MB && bytes % MB === 0) return `${bytes / MB} MB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB && bytes % KB === 0) return `${bytes / KB} KB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${bytes} B`;
}

export const FILE_SIZE_PRESETS = [
  { label: '1 MB — photos small', bytes: 1 * MB },
  { label: '2 MB — photos', bytes: 2 * MB },
  { label: '4 MB — docs', bytes: 4 * MB },
  { label: '8 MB — default', bytes: 8 * MB },
  { label: '16 MB — large docs', bytes: 16 * MB },
  { label: '32 MB — max', bytes: 32 * MB },
] as const;

export const MESSAGE_SIZE_PRESETS = [
  { label: '4 KB — short', bytes: 4 * KB },
  { label: '16 KB — notes', bytes: 16 * KB },
  { label: '32 KB — default', bytes: 32 * KB },
  { label: '64 KB — long', bytes: 64 * KB },
  { label: '256 KB — essays', bytes: 256 * KB },
] as const;

export const HOP_PRESETS = [
  { label: '3 hops — close neighbors', hops: 3 },
  { label: '6 hops — default LAN', hops: 6 },
  { label: '10 hops — wide mesh', hops: 10 },
  { label: '16 hops — max reach', hops: 16 },
] as const;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Flat solid avatar tones — no gradients */
export function avatarTone(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `tone-${(h % 6) + 1}`;
}

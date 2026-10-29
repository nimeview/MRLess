/** Save a base64 payload outside the app (iOS share sheet or browser download). */

type IosBridge = {
  webkit?: {
    messageHandlers?: {
      saveFile?: { postMessage: (payload: { fileName: string; dataB64: string }) => void };
    };
  };
};

export function saveFileOutside(fileName: string, dataB64: string) {
  const ios = (window as unknown as IosBridge).webkit?.messageHandlers?.saveFile;
  if (ios) {
    ios.postMessage({ fileName, dataB64 });
    return;
  }

  try {
    const binary = atob(dataB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'file.bin';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    /* ignore */
  }
}

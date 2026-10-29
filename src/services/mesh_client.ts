import type {
  AvatarInfo,
  ChatMessage,
  ConfigPatch,
  ConfigPayload,
  ContactInfo,
  DeliveryStatus,
  FileExport,
  FileOffer,
  GroupInfo,
  InviteInfo,
  MeshStats,
  NodeHello,
  PeerInfo,
  StorageUsage,
} from '../features/chat/types';

type Handlers = {
  onHello?: (hello: NodeHello) => void;
  onNeedOnboarding?: (nodeId: string) => void;
  onPeers?: (peers: PeerInfo[]) => void;
  onContacts?: (contacts: ContactInfo[]) => void;
  onGroups?: (groups: GroupInfo[]) => void;
  onMessage?: (msg: ChatMessage) => void;
  onFile?: (file: FileOffer) => void;
  onFileReceived?: (info: { file_id: string; file_name: string; path: string; size: number }) => void;
  onConfig?: (cfg: ConfigPayload) => void;
  onMeshStats?: (stats: MeshStats) => void;
  onMessageStatus?: (id: string, status: DeliveryStatus) => void;
  onInvite?: (invite: InviteInfo) => void;
  onStorage?: (usage: StorageUsage) => void;
  onMessagesDeleted?: (chatKey: string) => void;
  onFileDeleted?: (fileId: string) => void;
  onFileCachePurged?: () => void;
  onMessageDeleted?: (id: string) => void;
  onFileExport?: (exp: FileExport) => void;
  onFileOfferDeleted?: (fileId: string) => void;
  onAvatar?: (avatar: AvatarInfo) => void;
  onStatus?: (text: string) => void;
  onError?: (text: string) => void;
  onCleared?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export class MeshClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Handlers;
  private reconnectTimer: number | null = null;
  private intentionalClose = false;
  private reconnectAttempt = 0;

  constructor(url: string, handlers: Handlers) {
    this.url = url;
    this.handlers = handlers;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.intentionalClose = false;
    this.clearReconnectTimer();
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.handlers.onOpen?.();
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.handlers.onClose?.();
      if (!this.intentionalClose) this.scheduleReconnect();
    };
    ws.onerror = () => {};
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data));
        switch (data.type) {
          case 'hello':
            this.handlers.onHello?.(data);
            break;
          case 'need_onboarding':
            this.handlers.onNeedOnboarding?.(data.node_id);
            break;
          case 'peers':
            this.handlers.onPeers?.(data.peers ?? []);
            break;
          case 'contacts':
            this.handlers.onContacts?.(data.contacts ?? []);
            break;
          case 'groups':
            this.handlers.onGroups?.(data.groups ?? []);
            break;
          case 'message':
            this.handlers.onMessage?.(data);
            break;
          case 'file_available':
            this.handlers.onFile?.(data);
            break;
          case 'file_received':
            this.handlers.onFileReceived?.(data);
            break;
          case 'config':
            this.handlers.onConfig?.(data);
            break;
          case 'mesh_stats':
            this.handlers.onMeshStats?.(data);
            break;
          case 'message_status':
            this.handlers.onMessageStatus?.(data.id, data.status);
            break;
          case 'invite':
            this.handlers.onInvite?.(data);
            break;
          case 'storage_usage':
            this.handlers.onStorage?.(data);
            break;
          case 'messages_deleted':
            this.handlers.onMessagesDeleted?.(data.chat_key);
            break;
          case 'file_deleted':
            this.handlers.onFileDeleted?.(data.file_id);
            break;
          case 'file_cache_purged':
            this.handlers.onFileCachePurged?.();
            break;
          case 'message_deleted':
            this.handlers.onMessageDeleted?.(data.id);
            break;
          case 'file_export':
            this.handlers.onFileExport?.(data);
            break;
          case 'file_offer_deleted':
            this.handlers.onFileOfferDeleted?.(data.file_id);
            break;
          case 'avatar':
            this.handlers.onAvatar?.(data);
            break;
          case 'status':
            this.handlers.onStatus?.(data.text);
            break;
          case 'error':
            this.handlers.onError?.(data.text);
            break;
          case 'cleared':
            this.handlers.onCleared?.();
            break;
        }
      } catch {
        // ignore malformed
      }
    };
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Drop a half-dead socket (common after iOS background) and dial again. */
  forceReconnect() {
    this.intentionalClose = false;
    this.clearReconnectTimer();
    this.reconnectAttempt = 0;
    const old = this.ws;
    this.ws = null;
    if (old) {
      old.onopen = null;
      old.onclose = null;
      old.onerror = null;
      old.onmessage = null;
      try {
        old.close();
      } catch {
        /* ignore */
      }
    }
    this.connect();
  }

  /** Reconnect only if the socket is missing or not open. */
  ensureConnected() {
    const state = this.ws?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
    this.forceReconnect();
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.intentionalClose) return;
    if (this.reconnectTimer != null) return;
    const delay = Math.min(8_000, 400 + this.reconnectAttempt * 600);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private send(payload: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  setName(name: string) {
    return this.send({ type: 'set_name', name });
  }

  setAvatar(dataB64: string, mime = 'image/jpeg') {
    return this.send({ type: 'set_avatar', data_b64: dataB64, mime });
  }

  clearAvatar() {
    return this.send({ type: 'set_avatar', data_b64: '', mime: '' });
  }

  sendMessage(
    body: string,
    to?: string | null,
    groupId?: string | null,
    replyTo?: string | null,
  ) {
    return this.send({
      type: 'send',
      body,
      to: to || null,
      group_id: groupId || null,
      reply_to: replyTo || null,
    });
  }

  editMessage(id: string, body: string) {
    return this.send({ type: 'edit_message', id, body });
  }

  forwardMessage(id: string, to?: string | null, groupId?: string | null) {
    return this.send({
      type: 'forward',
      id,
      to: to || null,
      group_id: groupId || null,
    });
  }

  deleteFileOffer(fileId: string) {
    return this.send({ type: 'delete_file_offer', file_id: fileId });
  }

  sendFile(fileName: string, dataB64: string, to?: string | null, groupId?: string | null) {
    return this.send({
      type: 'send_file',
      file_name: fileName,
      data_b64: dataB64,
      to: to || null,
      group_id: groupId || null,
    });
  }

  createGroup(name: string, members: string[]) {
    return this.send({ type: 'create_group', name, members });
  }

  updateGroup(id: string, patch: { name?: string; members?: string[] }) {
    return this.send({
      type: 'update_group',
      id,
      name: patch.name ?? null,
      members: patch.members ?? null,
    });
  }

  leaveGroup(id: string) {
    return this.send({ type: 'leave_group', id });
  }

  deleteGroup(id: string) {
    return this.send({ type: 'delete_group', id });
  }

  requestFile(fileId: string, from: string) {
    return this.send({ type: 'request_file', file_id: fileId, from });
  }

  exportFile(fileId: string) {
    return this.send({ type: 'export_file', file_id: fileId });
  }

  getStorage() {
    return this.send({ type: 'get_storage' });
  }

  deleteMessages(chatKey: string) {
    return this.send({ type: 'delete_messages', chat_key: chatKey });
  }

  deleteFile(fileId: string) {
    return this.send({ type: 'delete_file', file_id: fileId });
  }

  purgeFileCache() {
    return this.send({ type: 'purge_file_cache' });
  }

  deleteMessage(id: string) {
    return this.send({ type: 'delete_message', id });
  }

  completeOnboarding(name: string) {
    return this.send({ type: 'complete_onboarding', name });
  }

  getConfig() {
    return this.send({ type: 'get_config' });
  }

  setConfig(patch: ConfigPatch) {
    return this.send({ type: 'set_config', patch });
  }

  addManualPeer(addr: string) {
    return this.send({ type: 'add_manual_peer', addr });
  }

  removeManualPeer(addr: string) {
    return this.send({ type: 'remove_manual_peer', addr });
  }

  reconnectPeers() {
    return this.send({ type: 'reconnect_peers' });
  }

  resend(id: string) {
    return this.send({ type: 'resend', id });
  }

  getInvite() {
    return this.send({ type: 'get_invite' });
  }

  refreshInvite() {
    return this.send({ type: 'refresh_invite' });
  }

  resetNode() {
    return this.send({ type: 'reset_node' });
  }

  disconnect() {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.ws?.close();
    this.ws = null;
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Compress an image file to JPEG ≤ ~40 KB for profile avatar upload. */
export async function compressAvatar(file: File): Promise<{ dataB64: string; mime: string }> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 192;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 55_000 && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  const comma = dataUrl.indexOf(',');
  return { dataB64: dataUrl.slice(comma + 1), mime: 'image/jpeg' };
}

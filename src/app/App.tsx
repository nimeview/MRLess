import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import type {
  ChatItem,
  ChatMessage,
  ChatTab,
  ConfigPatch,
  ConfigPayload,
  ContactInfo,
  FileOffer,
  GlobalHit,
  GroupInfo,
  InviteInfo,
  MeshStats,
  NodeHello,
  PeerInfo,
  ReachKind,
  StorageUsage,
} from '../features/chat/types';
import { MeshClient, compressAvatar, fileToBase64 } from '../services/mesh_client';
import { saveFileOutside } from '../services/save_file';
import { ChatInfo } from '../ui/ChatInfo';
import { ChatList } from '../ui/ChatList';
import { ChatThread } from '../ui/ChatThread';
import { isImageName, type MsgAction } from '../ui/MessageBubble';
import { NewGroup } from '../ui/NewGroup';
import { Onboarding } from '../ui/Onboarding';
import { Settings } from '../ui/Settings';
import { Storage } from '../ui/Storage';
import './app.css';

function mimeFromName(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.gif')) return 'image/gif';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.heic')) return 'image/heic';
  return 'application/octet-stream';
}

function b64ToObjectUrl(dataB64: string, fileName: string) {
  const bin = atob(dataB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeFromName(fileName) });
  return URL.createObjectURL(blob);
}

function avatarB64ToUrl(dataB64: string, mime: string) {
  const bin = atob(dataB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime || 'image/jpeg' }));
}

function fileMatchesChatKey(f: FileOffer, chatKey: string, me: string) {
  if (chatKey === 'lan') return !f.group_id && f.to == null;
  if (chatKey.startsWith('g:')) return f.group_id === chatKey.slice(2);
  if (f.group_id) return false;
  return (
    (f.to === chatKey && f.from === me) ||
    (f.from === chatKey && (f.to === me || f.to == null || !me))
  );
}

const WS_URL =
  (window as unknown as { __MRLESS_WS?: string }).__MRLESS_WS ??
  import.meta.env.VITE_MRLESS_WS ??
  'ws://127.0.0.1:7422';
const LAN_KEY = 'lan';

type View = 'list' | 'thread' | 'info' | 'settings' | 'newGroup' | 'storage';

function messageMatchesChatKey(m: ChatMessage, chatKey: string, me: string) {
  if (chatKey === 'lan') return !m.group_id && m.to == null;
  if (chatKey.startsWith('g:')) return m.group_id === chatKey.slice(2);
  if (m.group_id || m.to == null) return false;
  const other = m.mine ? m.to : m.from;
  return other === chatKey && (m.mine || m.to === me || !me);
}

function rosterSig(list: { id: string; name?: string; addr?: string; reach?: string; last_addr?: string | null }[]) {
  return list
    .map((p) => `${p.id}|${p.name ?? ''}|${p.addr ?? p.last_addr ?? ''}|${p.reach ?? ''}`)
    .join(';');
}

function useIsMobile() {
  const [mobile, setMobile] = createSignal(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 820px)').matches : false,
  );
  onMount(() => {
    const mq = window.matchMedia('(max-width: 820px)');
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    onCleanup(() => mq.removeEventListener('change', apply));
  });
  return mobile;
}

export default function App() {
  const isMobile = useIsMobile();

  const [connected, setConnected] = createSignal(false);
  const [hello, setHello] = createSignal<NodeHello | null>(null);
  const [peers, setPeers] = createSignal<PeerInfo[]>([], {
    equals: (a, b) => rosterSig(a) === rosterSig(b),
  });
  const [contacts, setContacts] = createSignal<ContactInfo[]>([], {
    equals: (a, b) => rosterSig(a) === rosterSig(b),
  });
  const [groups, setGroups] = createSignal<GroupInfo[]>([], {
    equals: (a, b) =>
      a.length === b.length &&
      a.every((g, i) => g.id === b[i].id && g.seq === b[i].seq && g.name === b[i].name),
  });
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [files, setFiles] = createSignal<FileOffer[]>([]);
  const [status, setStatus] = createSignal('connecting…');
  const [drafts, setDrafts] = createSignal<Record<string, string>>({});
  const [nameDraft, setNameDraft] = createSignal('');
  const [activeKey, setActiveKey] = createSignal(LAN_KEY);
  const [tab, setTab] = createSignal<ChatTab>('all');
  const [query, setQuery] = createSignal('');
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [storageOpen, setStorageOpen] = createSignal(false);
  const [storage, setStorage] = createSignal<StorageUsage | null>(null);
  const [newGroupOpen, setNewGroupOpen] = createSignal(false);
  const [needOnboarding, setNeedOnboarding] = createSignal(false);
  const [config, setConfig] = createSignal<ConfigPayload | null>(null);
  const [stats, setStats] = createSignal<MeshStats | null>(null);
  const [infoOpen, setInfoOpen] = createSignal(false);
  const [mobileThread, setMobileThread] = createSignal(false);
  const [toast, setToast] = createSignal<string | null>(null);
  const [invite, setInvite] = createSignal<InviteInfo | null>(null);
  const [previews, setPreviews] = createSignal<Record<string, string>>({});
  /** node_id → object URL for profile photos */
  const [avatars, setAvatars] = createSignal<Record<string, string>>({});
  const [replyTo, setReplyTo] = createSignal<ChatMessage | null>(null);
  const [editing, setEditing] = createSignal<ChatMessage | null>(null);
  const [forwardMsg, setForwardMsg] = createSignal<ChatMessage | null>(null);
  const [lightbox, setLightbox] = createSignal<{
    fileId: string;
    url: string;
    name: string;
  } | null>(null);

  let client: MeshClient | null = null;
  let toastTimer: number | undefined;
  let patchTimer: number | undefined;
  let pendingPatch: ConfigPatch = {};
  const pendingSave = new Set<string>();
  const pendingPreview = new Set<string>();
  const autoRequested = new Set<string>();

  const showToast = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => setToast(null), 2200);
  };

  const clearLocal = () => {
    setMessages([]);
    setFiles([]);
    setDrafts({});
    setGroups([]);
    setReplyTo(null);
    setEditing(null);
    setForwardMsg(null);
    setLightbox(null);
    setPreviews((prev) => {
      for (const url of Object.values(prev)) URL.revokeObjectURL(url);
      return {};
    });
    setAvatars((prev) => {
      for (const url of Object.values(prev)) URL.revokeObjectURL(url);
      return {};
    });
    pendingSave.clear();
    pendingPreview.clear();
    autoRequested.clear();
  };

  const applyView = (view: View) => {
    setSettingsOpen(view === 'settings');
    setStorageOpen(view === 'storage');
    setNewGroupOpen(view === 'newGroup');
    setInfoOpen(view === 'info');
    setMobileThread(view === 'thread' || view === 'info');
  };

  const pushView = (view: View) => {
    applyView(view);
    if (isMobile()) history.pushState({ view, key: activeKey() }, '');
  };

  const closeOverlay = () => {
    if (isMobile() && history.state?.view && history.state.view !== 'list' && history.state.view !== 'thread') {
      history.back();
      return;
    }
    if (infoOpen()) applyView(mobileThread() || !isMobile() ? 'thread' : 'list');
    else applyView(mobileThread() ? 'thread' : 'list');
  };

  onMount(() => {
    history.replaceState({ view: 'list', key: LAN_KEY }, '');
    const onPop = (e: PopStateEvent) => {
      const view = (e.state?.view as View) || 'list';
      if (e.state?.key) setActiveKey(e.state.key);
      applyView(view);
    };
    window.addEventListener('popstate', onPop);
    onCleanup(() => window.removeEventListener('popstate', onPop));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsOpen() || storageOpen() || newGroupOpen() || infoOpen()) closeOverlay();
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));

    client = new MeshClient(WS_URL, {
      onOpen: () => {
        setConnected(true);
        setStatus('mesh node online');
        client?.getInvite();
      },
      onClose: () => {
        setConnected(false);
        setStatus('local node offline');
      },
      onHello: (h) => {
        setHello(h);
        setNameDraft(h.name);
        if (h.onboarded === false) setNeedOnboarding(true);
        else if (h.onboarded === true) setNeedOnboarding(false);
      },
      onNeedOnboarding: () => setNeedOnboarding(true),
      onConfig: (c) => {
        setConfig(c);
        setNameDraft(c.display_name);
        setNeedOnboarding(!c.onboarded);
      },
      onMeshStats: (s) => {
        setStats((prev) => {
          if (
            prev &&
            prev.peer_count === s.peer_count &&
            prev.onboarded === s.onboarded &&
            prev.discovery_enabled === s.discovery_enabled &&
            prev.mesh_reachable === s.mesh_reachable &&
            prev.invite_code === s.invite_code &&
            prev.listen_addr === s.listen_addr &&
            prev.invite === s.invite
          ) {
            return prev;
          }
          return s;
        });
        setInvite((prev) => {
          const url = s.invite ?? prev?.url ?? '';
          const code = s.invite_code ?? prev?.code;
          const listen = s.listen_addr ?? prev?.listen ?? '';
          if (prev && prev.url === url && prev.code === code && prev.listen === listen) return prev;
          if (!s.listen_addr && !s.invite_code && !s.invite) return prev;
          return {
            url,
            code,
            listen,
            node_id: hello()?.node_id ?? prev?.node_id ?? '',
          };
        });
      },
      onPeers: (p) => setPeers(p),
      onContacts: (c) => setContacts(c),
      onGroups: (g) => setGroups(g),
      onInvite: (inv) =>
        setInvite({
          url: inv.url,
          code: inv.code,
          listen: inv.listen,
          node_id: inv.node_id,
        }),
      onStorage: (u) => setStorage(u),
      onMessagesDeleted: (chatKey) => {
        const me = myId();
        setMessages((prev) => prev.filter((m) => !messageMatchesChatKey(m, chatKey, me)));
      },
      onFileDeleted: (fileId) => {
        setFiles((prev) =>
          prev.map((f) => (f.file_id === fileId ? { ...f, local: false } : f)),
        );
      },
      onFileCachePurged: () => {
        setFiles((prev) => prev.map((f) => ({ ...f, local: false })));
      },
      onMessageDeleted: (id) => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (replyTo()?.id === id) setReplyTo(null);
        if (editing()?.id === id) setEditing(null);
      },
      onFileOfferDeleted: (fileId) => {
        setFiles((prev) => prev.filter((f) => f.file_id !== fileId));
        setPreviews((prev) => {
          const url = prev[fileId];
          if (url) URL.revokeObjectURL(url);
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      },
      onAvatar: (a) => {
        setAvatars((prev) => {
          const old = prev[a.node_id];
          if (old) URL.revokeObjectURL(old);
          if (!a.data_b64) {
            const next = { ...prev };
            delete next[a.node_id];
            return next;
          }
          return { ...prev, [a.node_id]: avatarB64ToUrl(a.data_b64, a.mime) };
        });
      },
      onFileExport: (exp) => {
        const url = b64ToObjectUrl(exp.data_b64, exp.file_name);
        setPreviews((prev) => {
          const old = prev[exp.file_id];
          if (old) URL.revokeObjectURL(old);
          return { ...prev, [exp.file_id]: url };
        });
        setFiles((prev) =>
          prev.map((f) => (f.file_id === exp.file_id ? { ...f, local: true } : f)),
        );
        if (pendingSave.has(exp.file_id)) {
          pendingSave.delete(exp.file_id);
          saveFileOutside(exp.file_name, exp.data_b64);
          showToast(`saved · ${exp.file_name}`);
        }
        pendingPreview.delete(exp.file_id);
        if (lightbox()?.fileId === exp.file_id) {
          setLightbox({ fileId: exp.file_id, url, name: exp.file_name });
        }
      },
      onMessageStatus: (id, status) => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      },
      onMessage: (m) => {
        setMessages((prev) => {
          const i = prev.findIndex((x) => x.id === m.id);
          if (i < 0) return [...prev, m];
          const next = prev.slice();
          const prevMsg = next[i];
          next[i] = {
            ...prevMsg,
            ...m,
            // Keep reply meta if a partial update omits it.
            reply_to: m.reply_to ?? prevMsg.reply_to,
            reply_author: m.reply_author ?? prevMsg.reply_author,
            reply_snippet: m.reply_snippet ?? prevMsg.reply_snippet,
          };
          return next;
        });
        if (m.edited && editing()?.id === m.id) {
          setEditing(null);
        }
      },
      onFile: (f) => {
        setFiles((prev) => {
          const i = prev.findIndex((x) => x.file_id === f.file_id);
          if (i < 0) return [...prev, f];
          const next = prev.slice();
          next[i] = { ...next[i], ...f, local: f.local || next[i].local };
          return next;
        });
        if (f.local && isImageName(f.file_name) && !pendingPreview.has(f.file_id)) {
          pendingPreview.add(f.file_id);
          client?.exportFile(f.file_id);
        }
        if (!f.local && isImageName(f.file_name) && !autoRequested.has(f.file_id)) {
          autoRequested.add(f.file_id);
          client?.requestFile(f.file_id, f.from);
        }
      },
      onFileReceived: (info) => {
        setFiles((prev) =>
          prev.map((f) => (f.file_id === info.file_id ? { ...f, local: true } : f)),
        );
        if (isImageName(info.file_name) && !pendingPreview.has(info.file_id)) {
          pendingPreview.add(info.file_id);
          client?.exportFile(info.file_id);
        }
      },
      onStatus: (t) => {
        setStatus(t);
      },
      onError: (t) => {
        setStatus(`error: ${t}`);
        showToast(t);
      },
      onCleared: () => {
        clearLocal();
        setStorage(null);
        setSettingsOpen(false);
        setStorageOpen(false);
      },
    });
    client.connect();

    // iOS/WKWebView: sockets die or go zombie after background — force revive on return.
    const resumeWs = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      client?.forceReconnect();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') client?.forceReconnect();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', resumeWs);
    window.addEventListener('focus', resumeWs);
    (window as unknown as { __MRLESS_RESUME__?: () => void }).__MRLESS_RESUME__ = () => {
      client?.forceReconnect();
    };
    onCleanup(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', resumeWs);
      window.removeEventListener('focus', resumeWs);
      delete (window as unknown as { __MRLESS_RESUME__?: () => void }).__MRLESS_RESUME__;
    });
  });

  onCleanup(() => {
    client?.disconnect();
    window.clearTimeout(toastTimer);
    window.clearTimeout(patchTimer);
  });

  const myId = () => hello()?.node_id ?? '';
  const draft = () => drafts()[activeKey()] ?? '';
  const setDraft = (v: string) => {
    const key = activeKey();
    setDrafts((prev) => ({ ...prev, [key]: v }));
  };

  const matchText = (q: string, ...parts: string[]) => {
    if (!q) return true;
    return parts.some((p) => p.toLowerCase().includes(q));
  };

  const nameFor = (id: string, fallbackMsgs = messages()) => {
    const live = peers().find((p) => p.id === id);
    if (live?.name) return live.name;
    const remembered = contacts().find((c) => c.id === id)?.name;
    if (remembered) return remembered;
    for (let i = fallbackMsgs.length - 1; i >= 0; i--) {
      const m = fallbackMsgs[i];
      if (m.from === id && m.from_name) return m.from_name;
    }
    return id.slice(0, 8);
  };

  const allChats = createMemo((): ChatItem[] => {
    const msgs = messages();
    const fileList = files();
    const peerList = peers();
    const me = myId();
    void contacts();
    const groupList = groups();

    const lanMsgs = msgs.filter((m) => !m.group_id && m.to == null);
    const lanFiles = fileList.filter((f) => !f.group_id && f.to == null);
    const lanLastMsg = lanMsgs[lanMsgs.length - 1];
    const lanLastFile = lanFiles[lanFiles.length - 1];
    const lanLastTs = Math.max(lanLastMsg?.ts ?? 0, lanLastFile?.ts ?? 0);
    const items: ChatItem[] = [
      {
        key: LAN_KEY,
        kind: 'group',
        title: 'LAN Mesh',
        peerId: null,
        groupId: null,
        lan: true,
        subtitle: peerList.length
          ? `${peerList.length} peer${peerList.length === 1 ? '' : 's'} nearby`
          : 'waiting for peers…',
        lastBody: lanLastMsg?.body ?? (lanLastFile ? lanLastFile.file_name : 'Local broadcast room'),
        lastTs: lanLastTs,
        online: connected(),
      },
    ];

    for (const g of groupList) {
      const gm = msgs.filter((m) => m.group_id === g.id);
      const gf = fileList.filter((f) => f.group_id === g.id);
      const last = gm[gm.length - 1];
      const lastF = gf[gf.length - 1];
      const lastTs = Math.max(last?.ts ?? 0, lastF?.ts ?? 0);
      const liveMembers = g.members.filter((id) => id !== me && peerList.some((p) => p.id === id));
      items.push({
        key: `g:${g.id}`,
        kind: 'group',
        title: g.name,
        peerId: null,
        groupId: g.id,
        lan: false,
        memberIds: g.members,
        ownerId: g.owner,
        subtitle: `${g.members.length} member${g.members.length === 1 ? '' : 's'}`,
        lastBody: last?.body ?? (lastF ? lastF.file_name : 'Closed group'),
        lastTs,
        online: liveMembers.length > 0 || connected(),
      });
    }

    for (const p of peerList) {
      const dm = msgs.filter(
        (m) =>
          !m.group_id &&
          m.to != null &&
          ((m.mine && m.to === p.id) || (!m.mine && m.from === p.id && m.to === me)),
      );
      const df = fileList.filter((f) => fileMatchesChatKey(f, p.id, me));
      const last = dm[dm.length - 1];
      const lastF = df[df.length - 1];
      const lastTs = Math.max(last?.ts ?? 0, lastF?.ts ?? 0);
      const reach: ReachKind = p.reach ?? 'direct';
      const live = reach !== 'offline';
      const sub =
        reach === 'mesh'
          ? p.addr
            ? `via mesh · ${p.addr}`
            : 'reachable via mesh'
          : p.rtt_ms != null
            ? `${p.addr} · ${p.rtt_ms}ms`
            : p.addr || 'direct';
      items.push({
        key: p.id,
        kind: 'dm',
        title: p.name,
        peerId: p.id,
        subtitle: sub,
        lastBody: last?.body ?? (lastF ? lastF.file_name : 'Tap to message'),
        lastTs,
        online: live,
        reach,
      });
    }

    const knownDmIds = new Set(peerList.map((p) => p.id));
    const orphanFrom = new Map<string, { body: string; ts: number }>();
    for (const m of msgs) {
      if (m.group_id || m.to == null) continue;
      const other = m.mine ? m.to : m.from;
      if (!other || other === me || knownDmIds.has(other)) continue;
      const prev = orphanFrom.get(other);
      if (!prev || m.ts >= prev.ts) orphanFrom.set(other, { body: m.body, ts: m.ts });
    }
    for (const f of fileList) {
      if (f.group_id || (f.to == null && f.from !== me)) continue;
      const other = f.from === me ? f.to : f.from;
      if (!other || other === me || knownDmIds.has(other)) continue;
      const prev = orphanFrom.get(other);
      if (!prev || f.ts >= prev.ts) orphanFrom.set(other, { body: f.file_name, ts: f.ts });
    }
    for (const [id, last] of orphanFrom) {
      const remembered = contacts().find((c) => c.id === id);
      items.push({
        key: id,
        kind: 'dm',
        title: nameFor(id, msgs),
        peerId: id,
        subtitle: remembered?.last_addr
          ? `offline · ${remembered.last_addr}`
          : 'offline — queued until they return',
        lastBody: last.body,
        lastTs: last.ts,
        online: false,
        reach: 'offline',
      });
    }

    items.sort((a, b) => {
      if (a.key === LAN_KEY) return -1;
      if (b.key === LAN_KEY) return 1;
      return (b.lastTs || 0) - (a.lastTs || 0);
    });
    return items;
  });

  const searching = createMemo(() => query().trim().length > 0);

  const chats = createMemo((): ChatItem[] => {
    const q = query().trim().toLowerCase();
    const items = allChats();

    if (!q) {
      return items.filter((c) => {
        if (tab() === 'groups' && c.kind !== 'group') return false;
        if (tab() === 'direct' && c.kind !== 'dm') return false;
        if (c.kind === 'group') return true;
        if (c.lastTs > 0) return true;
        return c.online;
      });
    }

    return items.filter((c) => {
      const isLocalChat = c.kind === 'group' || c.lastTs > 0;
      if (!isLocalChat) return false;
      return matchText(q, c.title, c.subtitle, c.lastBody, c.peerId ?? '', c.groupId ?? '');
    });
  });

  const globalHits = createMemo((): GlobalHit[] => {
    const q = query().trim().toLowerCase();
    if (!q) return [];

    const localChatKeys = new Set(
      allChats()
        .filter((c) => c.kind === 'group' || c.lastTs > 0)
        .filter((c) => matchText(q, c.title, c.subtitle, c.lastBody, c.peerId ?? ''))
        .map((c) => c.key),
    );
    const hits = new Map<string, GlobalHit>();

    for (const p of peers()) {
      if (localChatKeys.has(p.id)) continue;
      if (!matchText(q, p.name, p.addr, p.id, p.source ?? '')) continue;
      const reach: ReachKind = p.reach ?? 'direct';
      const live = reach !== 'offline';
      hits.set(p.id, {
        id: p.id,
        name: p.name || p.id.slice(0, 8),
        addr: p.addr,
        subtitle:
          reach === 'mesh'
            ? `${p.addr || 'mesh'} · via mesh · start chat`
            : p.rtt_ms != null
              ? `${p.addr} · ${p.rtt_ms}ms · start chat`
              : `${p.addr} · start chat`,
        online: live,
        rtt_ms: p.rtt_ms,
        reach,
      });
    }

    for (const m of messages()) {
      if (m.from === myId()) continue;
      if (localChatKeys.has(m.from) || hits.has(m.from)) continue;
      if (!matchText(q, m.from_name, m.from)) continue;
      hits.set(m.from, {
        id: m.from,
        name: m.from_name || m.from.slice(0, 8),
        addr: '',
        subtitle: 'seen on LAN · start direct chat',
        online: false,
      });
    }

    return [...hits.values()].sort(
      (a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
    );
  });

  const peerCount = createMemo(() => peers().length);

  const activeChat = createMemo((): ChatItem | null => {
    const key = activeKey();
    const fromAll = allChats().find((c) => c.key === key);
    if (fromAll) return fromAll;
    const hit = peers().find((p) => p.id === key);
    if (!hit) return null;
    const reach: ReachKind = hit.reach ?? 'direct';
    return {
      key: hit.id,
      kind: 'dm',
      title: nameFor(hit.id) || hit.name,
      peerId: hit.id,
      subtitle: hit.addr || 'offline — queued until they return',
      lastBody: 'Tap to message',
      lastTs: 0,
      online: reach !== 'offline',
      reach,
      fromGlobal: true,
    };
  });

  createEffect(() => {
    if (searching()) return;
    const key = activeKey();
    const keys = new Set(allChats().map((c) => c.key));
    if (keys.has(key)) return;
    // Keep chat open if we still have local messages/files for this key.
    const me = myId();
    const hasMsgs = messages().some((m) => messageMatchesChatKey(m, key, me));
    const hasFiles = files().some((f) => fileMatchesChatKey(f, key, me));
    if (hasMsgs || hasFiles || peers().some((p) => p.id === key)) return;
    if (allChats()[0]) setActiveKey(allChats()[0].key);
  });

  const threadMessages = createMemo(() => {
    const chat = activeChat();
    if (!chat) return [] as ChatMessage[];
    if (chat.groupId) return messages().filter((m) => m.group_id === chat.groupId);
    if (chat.kind === 'group') return messages().filter((m) => !m.group_id && m.to == null);
    const pid = chat.peerId!;
    return messages().filter(
      (m) =>
        !m.group_id &&
        m.to != null &&
        ((m.mine && m.to === pid) || (!m.mine && m.from === pid && (m.to === myId() || !myId()))),
    );
  });

  const threadFiles = createMemo(() => {
    const chat = activeChat();
    if (!chat) return [] as FileOffer[];
    if (chat.groupId) return files().filter((f) => f.group_id === chat.groupId);
    if (chat.kind === 'group') return files().filter((f) => !f.group_id && f.to == null);
    const pid = chat.peerId!;
    const me = myId();
    return files().filter(
      (f) =>
        !f.group_id &&
        ((f.to === pid && f.from === me) || (f.from === pid && (f.to === me || f.to == null))),
    );
  });

  const destFor = (chat: ChatItem | null) => {
    if (!chat) return { to: null as string | null, groupId: null as string | null };
    if (chat.groupId) return { to: null, groupId: chat.groupId };
    if (chat.kind === 'dm') return { to: chat.peerId, groupId: null };
    return { to: null, groupId: null };
  };

  const openChat = (key: string) => {
    setActiveKey(key);
    setQuery('');
    pushView('thread');
  };

  const openGlobal = (hit: GlobalHit) => {
    setActiveKey(hit.id);
    setQuery('');
    pushView('thread');
    showToast(`Chat with ${hit.name}`);
  };

  const send = (e: Event) => {
    e.preventDefault();
    const body = draft().trim();
    if (!body || !client) return;
    if (!connected()) {
      showToast('node offline');
      return;
    }
    const edit = editing();
    if (edit) {
      if (!client.editMessage(edit.id, body)) {
        showToast('not connected');
        return;
      }
      setEditing(null);
      setDraft('');
      return;
    }
    const { to, groupId } = destFor(activeChat());
    const reply = replyTo()?.id ?? null;
    if (!client.sendMessage(body, to, groupId, reply)) {
      showToast('not connected');
      return;
    }
    setReplyTo(null);
    setDraft('');
  };

  const onMsgAction = (action: MsgAction, message: ChatMessage) => {
    if (action === 'copy') {
      void navigator.clipboard?.writeText(message.body);
      showToast('copied');
      return;
    }
    if (action === 'reply') {
      setEditing(null);
      setReplyTo(message);
      return;
    }
    if (action === 'edit') {
      setReplyTo(null);
      setEditing(message);
      setDraft(message.body);
      return;
    }
    if (action === 'delete') {
      if (!confirm('Delete this message?')) return;
      client?.deleteMessage(message.id);
      return;
    }
    if (action === 'forward') {
      setForwardMsg(message);
    }
  };

  const doForward = (chatKey: string) => {
    const msg = forwardMsg();
    if (!msg || !client) return;
    let to: string | null = null;
    let groupId: string | null = null;
    if (chatKey === LAN_KEY) {
      to = null;
      groupId = null;
    } else if (chatKey.startsWith('g:')) {
      groupId = chatKey.slice(2);
    } else {
      to = chatKey;
    }
    if (!client.forwardMessage(msg.id, to, groupId)) {
      showToast('not connected');
      return;
    }
    setForwardMsg(null);
    openChat(chatKey);
    showToast('forwarded');
  };

  const saveFile = (fileId: string) => {
    pendingSave.add(fileId);
    client?.exportFile(fileId);
  };

  const openImage = (fileId: string) => {
    const f = files().find((x) => x.file_id === fileId);
    const url = previews()[fileId];
    if (url && f) {
      setLightbox({ fileId, url, name: f.file_name });
      return;
    }
    if (f?.local) {
      pendingPreview.add(fileId);
      client?.exportFile(fileId);
      setLightbox({ fileId, url: '', name: f.file_name });
    }
  };

  const saveName = () => {
    const name = nameDraft().trim();
    if (!name || !client) return;
    client.setName(name);
  };

  const onPickAvatar = async (file: File | null) => {
    if (!file || !client) return;
    try {
      const { dataB64, mime } = await compressAvatar(file);
      if (!client.setAvatar(dataB64, mime)) showToast('not connected');
      else showToast('avatar updated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'could not read image');
    }
  };

  const onClearAvatar = () => {
    client?.clearAvatar();
    showToast('avatar cleared');
  };

  const onPatch = (patch: ConfigPatch) => {
    const cleaned: ConfigPatch = { ...patch };
    for (const [k, v] of Object.entries(cleaned)) {
      if (typeof v === 'number' && !Number.isFinite(v)) {
        delete (cleaned as Record<string, unknown>)[k];
      }
    }
    if (Object.keys(cleaned).length === 0) return;
    pendingPatch = { ...pendingPatch, ...cleaned };
    window.clearTimeout(patchTimer);
    patchTimer = window.setTimeout(() => {
      const p = pendingPatch;
      pendingPatch = {};
      client?.setConfig(p);
    }, 400);
  };

  const onPickFile = async (ev: Event) => {
    const input = ev.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !client) return;
    if (!connected()) {
      showToast('node offline');
      input.value = '';
      return;
    }
    const max = config()?.config.max_file_bytes ?? 8 * 1024 * 1024;
    if (file.size > max) {
      const msg = `file too large (max ${Math.round(max / 1024 / 1024)} MB)`;
      setStatus(msg);
      showToast(msg);
      input.value = '';
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      const { to, groupId } = destFor(activeChat());
      if (!client.sendFile(file.name, b64, to, groupId)) {
        showToast('not connected');
        input.value = '';
        return;
      }
      setStatus(`sending ${file.name}…`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'could not read file');
    }
    input.value = '';
  };

  const onReset = () => {
    clearLocal();
    client?.resetNode();
  };

  return (
    <div
      class="app"
      classList={{
        'show-thread': mobileThread(),
        'info-open': infoOpen() && !isMobile(),
      }}
    >
      <ChatList
        chats={chats}
        globalHits={globalHits}
        searching={searching}
        peerCount={peerCount}
        activeKey={activeKey}
        tab={tab}
        query={query}
        connected={connected}
        status={status}
        hello={hello}
        avatars={avatars}
        onTab={setTab}
        onQuery={setQuery}
        onOpenChat={openChat}
        onOpenGlobal={openGlobal}
        onNewGroup={() => pushView('newGroup')}
        onOpenProfile={() => {
          pushView('settings');
          client?.getInvite();
        }}
      />

      <ChatThread
        chat={activeChat}
        messages={threadMessages}
        files={threadFiles}
        draft={draft}
        myId={myId}
        connected={connected}
        replyTo={replyTo}
        editing={editing}
        previews={previews}
        avatars={avatars}
        onDraft={setDraft}
        onBack={() => {
          if (isMobile() && history.state?.view === 'thread') history.back();
          else applyView('list');
        }}
        onOpenInfo={() => pushView('info')}
        onSend={send}
        onPickFile={onPickFile}
        onRequestFile={(fileId, from) => client?.requestFile(fileId, from)}
        onSaveFile={saveFile}
        onOpenImage={openImage}
        onResend={(id) => client?.resend(id)}
        onMsgAction={onMsgAction}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => {
          setEditing(null);
          setDraft('');
        }}
        onCallStub={(kind) =>
          showToast(kind === 'voice' ? 'Voice calls — soon' : 'Video calls — soon')
        }
      />

      <ChatInfo
        open={infoOpen}
        chat={activeChat}
        peers={peers}
        contacts={contacts}
        myId={myId}
        nameFor={nameFor}
        mobile={isMobile}
        onClose={() => {
          if (isMobile() && history.state?.view === 'info') history.back();
          else applyView(mobileThread() ? 'thread' : 'list');
        }}
        onRename={(id, name) => client?.updateGroup(id, { name })}
        onUpdateMembers={(id, members) => client?.updateGroup(id, { members })}
        onLeave={(id) => {
          setGroups((prev) => prev.filter((g) => g.id !== id));
          client?.leaveGroup(id);
          applyView(isMobile() ? 'list' : 'thread');
          setActiveKey(LAN_KEY);
          showToast('left group');
        }}
        onDelete={(id) => {
          setGroups((prev) => prev.filter((g) => g.id !== id));
          client?.deleteGroup(id);
          applyView(isMobile() ? 'list' : 'thread');
          setActiveKey(LAN_KEY);
          showToast('group deleted');
        }}
      />

      <NewGroup
        open={newGroupOpen}
        mobile={isMobile}
        contacts={contacts}
        peers={peers}
        myId={myId}
        onClose={() => {
          if (isMobile() && history.state?.view === 'newGroup') history.back();
          else applyView('list');
        }}
        onCreate={(name, members) => {
          client?.createGroup(name, members);
          if (isMobile() && history.state?.view === 'newGroup') history.back();
          else applyView('list');
          showToast(`Group “${name}” created`);
        }}
      />

      <Settings
        open={settingsOpen}
        mobile={isMobile}
        connected={connected}
        config={config}
        stats={stats}
        peers={peers}
        invite={invite}
        nameDraft={nameDraft}
        avatarUrl={() => {
          const id = config()?.node_id ?? hello()?.node_id;
          return id ? avatars()[id] ?? null : null;
        }}
        onName={setNameDraft}
        onSaveName={saveName}
        onPickAvatar={onPickAvatar}
        onClearAvatar={onClearAvatar}
        onPatch={onPatch}
        onAddPeer={(addr) => client?.addManualPeer(addr)}
        onRemovePeer={(addr) => client?.removeManualPeer(addr)}
        onReconnect={() => client?.reconnectPeers()}
        onGetInvite={() => client?.refreshInvite()}
        onOpenStorage={() => {
          pushView('storage');
          client?.getStorage();
        }}
        onReset={onReset}
        onClose={() => {
          if (isMobile() && history.state?.view === 'settings') history.back();
          else applyView(mobileThread() ? 'thread' : 'list');
        }}
      />

      <Storage
        open={storageOpen}
        mobile={isMobile}
        usage={storage}
        onClose={() => {
          if (isMobile() && history.state?.view === 'storage') history.back();
          else applyView('settings');
        }}
        onRefresh={() => client?.getStorage()}
        onDeleteChat={(key, title) => {
          if (!confirm(`Delete local history for “${title}”?`)) return;
          client?.deleteMessages(key);
        }}
        onDeleteFile={(fileId, name) => {
          if (!confirm(`Remove “${name}” from app cache?`)) return;
          client?.deleteFile(fileId);
        }}
        onPurgeFiles={() => client?.purgeFileCache()}
        onSaveFile={saveFile}
      />

      <Show when={forwardMsg()}>
        <div class="sheet-backdrop" onClick={() => setForwardMsg(null)}>
          <aside class="sheet forward-sheet" onClick={(e) => e.stopPropagation()}>
            <header class="sheet-head">
              <strong>Forward to…</strong>
              <button type="button" class="icon-btn" onClick={() => setForwardMsg(null)}>
                ×
              </button>
            </header>
            <ul class="forward-list">
              <For each={allChats()}>
                {(c) => (
                  <li>
                    <button type="button" class="forward-item" onClick={() => doForward(c.key)}>
                      <strong>{c.title}</strong>
                      <span class="dim">{c.kind}</span>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </aside>
        </div>
      </Show>

      <Show when={lightbox()}>
        {(lb) => (
          <div class="lightbox" onClick={() => setLightbox(null)}>
            <div class="lightbox-card" onClick={(e) => e.stopPropagation()}>
              <Show when={lb().url} fallback={<p class="dim">Loading…</p>}>
                <img src={lb().url} alt={lb().name} />
              </Show>
              <div class="lightbox-actions">
                <button
                  type="button"
                  class="btn primary"
                  onClick={() => {
                    saveFile(lb().fileId);
                  }}
                >
                  Save
                </button>
                <button type="button" class="btn ghost" onClick={() => setLightbox(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={needOnboarding()}>
        <Onboarding
          nodeId={() => hello()?.node_id ?? ''}
          initialName={nameDraft}
          onComplete={(name) => client?.completeOnboarding(name)}
        />
      </Show>

      <Show when={toast()}>
        <div class="toast">{toast()}</div>
      </Show>
    </div>
  );
}

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type ReachKind = 'direct' | 'mesh' | 'offline';

export type PeerInfo = {
  id: string;
  name: string;
  addr: string;
  last_seen?: number;
  source?: string;
  rtt_ms?: number | null;
  reach?: ReachKind;
};

export type ContactInfo = {
  id: string;
  name: string;
  last_addr?: string | null;
  last_seen?: number;
};

export type GroupInfo = {
  id: string;
  name: string;
  members: string[];
  owner: string;
  seq: number;
};

export type ChatMessage = {
  id: string;
  from: string;
  from_name: string;
  to: string | null;
  group_id?: string | null;
  body: string;
  ts: number;
  mine: boolean;
  status?: DeliveryStatus;
  reply_to?: string | null;
  reply_author?: string | null;
  reply_snippet?: string | null;
  edited?: boolean;
};

export type FileOffer = {
  id: string;
  from: string;
  from_name: string;
  to: string | null;
  group_id?: string | null;
  file_id: string;
  file_name: string;
  size: number;
  sha256: string;
  ts: number;
  local: boolean;
};

export type NodeHello = {
  node_id: string;
  name: string;
  mesh_port: number;
  ws_port: number;
  onboarded?: boolean;
};

export type NodeConfig = {
  mesh_port: number;
  ws_port: number;
  discovery_port: number;
  bind_mesh: string;
  bind_ws: string;
  discovery_enabled: boolean;
  discovery_interval_ms: number;
  ttl_default: number;
  max_body_bytes: number;
  max_file_bytes: number;
  heartbeat_interval_ms: number;
  peer_timeout_ms: number;
  manual_peers: string[];
  relay_enabled: boolean;
  accept_broadcast: boolean;
  max_peers: number;
  max_seen_ids: number;
  language: string;
  log_level: string;
  mesh_token?: string;
};

export type ConfigPayload = {
  config: NodeConfig;
  restart_required: boolean;
  display_name: string;
  node_id: string;
  onboarded: boolean;
};

export type MeshStats = {
  peer_count: number;
  uptime_secs: number;
  onboarded: boolean;
  discovery_enabled: boolean;
  mesh_reachable?: boolean;
  invite?: string | null;
  invite_code?: string | null;
  listen_addr?: string | null;
};

export type InviteInfo = {
  url: string;
  code?: string;
  listen: string;
  node_id: string;
};

export type ConfigPatch = Partial<NodeConfig>;

export type ChatKind = 'group' | 'dm';
export type ChatTab = 'all' | 'groups' | 'direct';

export type ChatItem = {
  key: string;
  kind: ChatKind;
  title: string;
  peerId: string | null;
  groupId?: string | null;
  lan?: boolean;
  memberIds?: string[];
  ownerId?: string | null;
  subtitle: string;
  lastBody: string;
  lastTs: number;
  online: boolean;
  reach?: ReachKind;
  /** True when this row came from mesh people search (not an existing chat). */
  fromGlobal?: boolean;
};

/** Peer hit in the global (mesh) half of the unified search. */
export type GlobalHit = {
  id: string;
  name: string;
  addr: string;
  subtitle: string;
  online: boolean;
  rtt_ms?: number | null;
  reach?: ReachKind;
};

export type StoredFileInfo = {
  file_id: string;
  file_name: string;
  size: number;
  path: string;
  ts?: number;
};

export type ChatStorageInfo = {
  key: string;
  title: string;
  kind: string;
  message_count: number;
  approx_bytes: number;
};

export type StorageUsage = {
  total_bytes: number;
  messages_bytes: number;
  files_bytes: number;
  other_bytes: number;
  message_count: number;
  files: StoredFileInfo[];
  chats: ChatStorageInfo[];
};

export type FileExport = {
  file_id: string;
  file_name: string;
  data_b64: string;
  size: number;
};

export type AvatarInfo = {
  node_id: string;
  mime: string;
  data_b64: string;
};

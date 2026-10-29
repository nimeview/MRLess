import { For, Show, createEffect, createSignal, type Accessor } from 'solid-js';
import type {
  ConfigPatch,
  ConfigPayload,
  InviteInfo,
  MeshStats,
  PeerInfo,
} from '../features/chat/types';
import {
  FILE_SIZE_PRESETS,
  HOP_PRESETS,
  MESSAGE_SIZE_PRESETS,
  avatarTone,
  fmtSize,
  initials,
} from './format';
import { IconClose } from './icons';

type Props = {
  open: Accessor<boolean>;
  mobile: Accessor<boolean>;
  connected: Accessor<boolean>;
  config: Accessor<ConfigPayload | null>;
  stats: Accessor<MeshStats | null>;
  peers: Accessor<PeerInfo[]>;
  invite: Accessor<InviteInfo | null>;
  nameDraft: Accessor<string>;
  avatarUrl: Accessor<string | null | undefined>;
  onName: (v: string) => void;
  onSaveName: () => void;
  onPickAvatar: (file: File | null) => void;
  onClearAvatar: () => void;
  onPatch: (patch: ConfigPatch) => void;
  onAddPeer: (addr: string) => void;
  onRemovePeer: (addr: string) => void;
  onReconnect: () => void;
  onGetInvite: () => void;
  onOpenStorage: () => void;
  onReset: () => void;
  onClose: () => void;
};

function nearestPreset(bytes: number, presets: readonly { bytes: number }[]) {
  let best = presets[0]?.bytes ?? bytes;
  let dist = Math.abs(best - bytes);
  for (const p of presets) {
    const d = Math.abs(p.bytes - bytes);
    if (d < dist) {
      best = p.bytes;
      dist = d;
    }
  }
  return best;
}

function nearestHops(hops: number) {
  let best: number = HOP_PRESETS[0].hops;
  let dist = Math.abs(best - hops);
  for (const p of HOP_PRESETS) {
    const d = Math.abs(p.hops - hops);
    if (d < dist) {
      best = p.hops;
      dist = d;
    }
  }
  return best;
}

export function Settings(props: Props) {
  const [peerDraft, setPeerDraft] = createSignal('');
  const [advancedOpen, setAdvancedOpen] = createSignal(false);
  const cfg = () => props.config()?.config;

  createEffect(() => {
    if (props.open()) {
      setPeerDraft('');
      setAdvancedOpen(false);
    }
  });

  const numPatch = (raw: string, key: keyof ConfigPatch) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    props.onPatch({ [key]: n } as ConfigPatch);
  };

  const copyText = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* ignore */
    }
  };

  const copyId = () => copyText(props.config()?.node_id);

  const fileSelectValue = () =>
    nearestPreset(cfg()?.max_file_bytes ?? 8 * 1024 * 1024, FILE_SIZE_PRESETS);
  const msgSelectValue = () =>
    nearestPreset(cfg()?.max_body_bytes ?? 32 * 1024, MESSAGE_SIZE_PRESETS);
  const hopSelectValue = () => nearestHops(cfg()?.ttl_default ?? 6);

  return (
    <Show when={props.open()}>
      <div
        class="sheet-backdrop settings-backdrop phone-sheet-wrap"
        classList={{ mobile: props.mobile() }}
        onClick={() => props.onClose()}
      >
        <aside
          class="sheet settings-sheet phone-sheet"
          classList={{ mobile: props.mobile() }}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          onClick={(e) => e.stopPropagation()}
        >
          <header class="sheet-head">
            <strong>Settings</strong>
            <button type="button" class="icon-btn" aria-label="Close" onClick={() => props.onClose()}>
              <IconClose size={18} />
            </button>
          </header>

          <div class="settings-body">
            <section>
              <h3>Profile</h3>
              <div class="profile-hero compact">
                <Show
                  when={props.avatarUrl()}
                  fallback={
                    <span class={`avatar xl ${avatarTone(props.config()?.node_id || 'me')}`}>
                      {initials(props.nameDraft() || 'MR')}
                    </span>
                  }
                >
                  <img
                    class="avatar xl photo"
                    src={props.avatarUrl()!}
                    alt=""
                    draggable={false}
                  />
                </Show>
                <div class={`mesh-pill ${props.connected() ? 'on' : ''}`}>
                  {props.connected() ? 'mesh online' : 'node offline'}
                </div>
              </div>
              <div class="sheet-actions inline avatar-actions">
                <label class="btn">
                  Change photo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0] ?? null;
                      props.onPickAvatar(f);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                <Show when={props.avatarUrl()}>
                  <button type="button" class="btn ghost" onClick={() => props.onClearAvatar()}>
                    Remove
                  </button>
                </Show>
              </div>
              <label class="field">
                <span>Display name</span>
                <input
                  value={props.nameDraft()}
                  maxlength={32}
                  onInput={(e) => props.onName(e.currentTarget.value)}
                />
              </label>
              <div class="sheet-actions inline">
                <button type="button" class="btn primary" onClick={() => props.onSaveName()}>
                  Save name
                </button>
              </div>
              <dl class="info-list">
                <div>
                  <dt>This device ID</dt>
                  <dd class="mono copy" onClick={copyId} title="Copy">
                    {props.config()?.node_id ?? '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3>Transfers</h3>
              <label class="field">
                <span>Max file size</span>
                <select
                  value={fileSelectValue()}
                  onChange={(e) =>
                    props.onPatch({ max_file_bytes: Number(e.currentTarget.value) })
                  }
                >
                  <For each={[...FILE_SIZE_PRESETS]}>
                    {(p) => <option value={p.bytes}>{p.label}</option>}
                  </For>
                </select>
              </label>
              <label class="field">
                <span>Max message size</span>
                <select
                  value={msgSelectValue()}
                  onChange={(e) =>
                    props.onPatch({ max_body_bytes: Number(e.currentTarget.value) })
                  }
                >
                  <For each={[...MESSAGE_SIZE_PRESETS]}>
                    {(p) => <option value={p.bytes}>{p.label}</option>}
                  </For>
                </select>
              </label>
              <dl class="info-list">
                <div>
                  <dt>Current file limit</dt>
                  <dd>{fmtSize(cfg()?.max_file_bytes ?? 0)}</dd>
                </div>
                <div>
                  <dt>Current text limit</dt>
                  <dd>{fmtSize(cfg()?.max_body_bytes ?? 0)}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3>Chat reach</h3>
              <label class="field">
                <span>Hop limit</span>
                <select
                  value={hopSelectValue()}
                  onChange={(e) => props.onPatch({ ttl_default: Number(e.currentTarget.value) })}
                >
                  <For each={[...HOP_PRESETS]}>
                    {(p) => <option value={p.hops}>{p.label}</option>}
                  </For>
                </select>
              </label>
              <label class="toggle">
                <input
                  type="checkbox"
                  checked={cfg()?.relay_enabled ?? true}
                  onChange={(e) => props.onPatch({ relay_enabled: e.currentTarget.checked })}
                />
                Forward messages through me (relay)
              </label>
              <label class="toggle">
                <input
                  type="checkbox"
                  checked={cfg()?.accept_broadcast ?? true}
                  onChange={(e) => props.onPatch({ accept_broadcast: e.currentTarget.checked })}
                />
                Show LAN Mesh broadcasts
              </label>
              <label class="toggle">
                <input
                  type="checkbox"
                  checked={cfg()?.discovery_enabled ?? true}
                  onChange={(e) => props.onPatch({ discovery_enabled: e.currentTarget.checked })}
                />
                Find neighbors automatically
              </label>
              <label class="field">
                <span>Mark peer offline after (sec)</span>
                <input
                  type="number"
                  min="5"
                  step="1"
                  value={Math.round((cfg()?.peer_timeout_ms ?? 15000) / 1000)}
                  onChange={(e) => {
                    const sec = Number(e.currentTarget.value);
                    if (!Number.isFinite(sec)) return;
                    props.onPatch({ peer_timeout_ms: Math.max(1, sec) * 1000 });
                  }}
                />
              </label>
            </section>

            <section>
              <h3>Invite code</h3>
              <div
                class="invite-code"
                onClick={() =>
                  copyText(props.invite()?.code || props.stats()?.invite_code || undefined)
                }
                title="Copy code"
              >
                {props.invite()?.code || props.stats()?.invite_code || '········'}
              </div>
              <div class="sheet-actions inline">
                <button
                  type="button"
                  class="btn primary"
                  onClick={() =>
                    copyText(props.invite()?.code || props.stats()?.invite_code || undefined)
                  }
                >
                  Copy code
                </button>
                <button type="button" class="btn ghost" onClick={() => props.onGetInvite()}>
                  Refresh
                </button>
              </div>
              <dl class="info-list">
                <div>
                  <dt>Reach me at</dt>
                  <dd class="mono copy" onClick={() => copyText(props.invite()?.listen)} title="Copy">
                    {props.invite()?.listen || props.stats()?.listen_addr || '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3>Neighbors</h3>
              <div class="row-add">
                <input
                  placeholder="Invite code or host:port"
                  value={peerDraft()}
                  maxLength={64}
                  autocomplete="off"
                  spellcheck={false}
                  onInput={(e) => setPeerDraft(e.currentTarget.value.toUpperCase())}
                />
                <button
                  type="button"
                  class="btn primary"
                  onClick={() => {
                    const a = peerDraft().trim();
                    if (!a) return;
                    props.onAddPeer(a);
                    setPeerDraft('');
                  }}
                >
                  Join
                </button>
              </div>
              <ul class="peer-edit">
                <For each={cfg()?.manual_peers ?? []}>
                  {(addr) => (
                    <li>
                      <span class="mono">{addr}</span>
                      <button type="button" class="link-btn" onClick={() => props.onRemovePeer(addr)}>
                        Remove
                      </button>
                    </li>
                  )}
                </For>
              </ul>
              <button type="button" class="btn ghost" onClick={() => props.onReconnect()}>
                Reconnect peers
              </button>
              <dl class="info-list">
                <div>
                  <dt>Online now</dt>
                  <dd>{props.stats()?.peer_count ?? props.peers().length}</dd>
                </div>
                <div>
                  <dt>Uptime</dt>
                  <dd>{props.stats()?.uptime_secs ?? 0}s</dd>
                </div>
              </dl>
              <ul class="peer-edit">
                <For each={props.peers()}>
                  {(p) => (
                    <li>
                      <span>
                        <strong>{p.name}</strong>{' '}
                        <span class="mono dim">
                          {p.reach ?? p.source ?? 'peer'} · {p.addr}
                          {p.rtt_ms != null ? ` · ${p.rtt_ms}ms` : ''}
                        </span>
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </section>

            <section>
              <button
                type="button"
                class="adv-toggle"
                aria-expanded={advancedOpen()}
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                <h3>Advanced</h3>
                <span class="dim">{advancedOpen() ? 'Hide' : 'Show'}</span>
              </button>
              <Show when={advancedOpen()}>
                <Show when={props.config()?.restart_required}>
                  <p class="warn">Restart required for bind/port changes.</p>
                </Show>
                <label class="field">
                  <span>Mesh port</span>
                  <input
                    type="number"
                    value={cfg()?.mesh_port ?? ''}
                    onChange={(e) => numPatch(e.currentTarget.value, 'mesh_port')}
                  />
                </label>
                <label class="field">
                  <span>UI WebSocket port</span>
                  <input
                    type="number"
                    value={cfg()?.ws_port ?? ''}
                    onChange={(e) => numPatch(e.currentTarget.value, 'ws_port')}
                  />
                </label>
                <label class="field">
                  <span>Discovery port</span>
                  <input
                    type="number"
                    value={cfg()?.discovery_port ?? ''}
                    onChange={(e) => numPatch(e.currentTarget.value, 'discovery_port')}
                  />
                </label>
                <label class="field">
                  <span>Bind mesh</span>
                  <input
                    value={cfg()?.bind_mesh ?? ''}
                    onChange={(e) => props.onPatch({ bind_mesh: e.currentTarget.value })}
                  />
                </label>
                <label class="field">
                  <span>Bind WS</span>
                  <input
                    value={cfg()?.bind_ws ?? ''}
                    onChange={(e) => props.onPatch({ bind_ws: e.currentTarget.value })}
                  />
                </label>
                <label class="field">
                  <span>Discovery interval (ms)</span>
                  <input
                    type="number"
                    value={cfg()?.discovery_interval_ms ?? ''}
                    onChange={(e) => numPatch(e.currentTarget.value, 'discovery_interval_ms')}
                  />
                </label>
                <label class="field">
                  <span>Heartbeat (ms)</span>
                  <input
                    type="number"
                    value={cfg()?.heartbeat_interval_ms ?? ''}
                    onChange={(e) => numPatch(e.currentTarget.value, 'heartbeat_interval_ms')}
                  />
                </label>
                <label class="field">
                  <span>Max peers</span>
                  <input
                    type="number"
                    value={cfg()?.max_peers ?? ''}
                    onChange={(e) => numPatch(e.currentTarget.value, 'max_peers')}
                  />
                </label>
                <label class="field">
                  <span>Log level</span>
                  <select
                    value={cfg()?.log_level ?? 'info'}
                    onChange={(e) => props.onPatch({ log_level: e.currentTarget.value })}
                  >
                    <option value="error">error</option>
                    <option value="warn">warn</option>
                    <option value="info">info</option>
                    <option value="debug">debug</option>
                    <option value="trace">trace</option>
                  </select>
                </label>
                <label class="field">
                  <span>Language</span>
                  <input
                    value={cfg()?.language ?? 'en'}
                    onChange={(e) => props.onPatch({ language: e.currentTarget.value })}
                  />
                </label>
                <label class="field">
                  <span>Join token (optional)</span>
                  <input
                    value={cfg()?.mesh_token ?? ''}
                    placeholder="shared secret for Hello"
                    onChange={(e) => props.onPatch({ mesh_token: e.currentTarget.value })}
                  />
                </label>
              </Show>
            </section>

            <section>
              <h3>Storage</h3>
              <div class="sheet-actions inline">
                <button type="button" class="btn primary" onClick={() => props.onOpenStorage()}>
                  Open storage
                </button>
              </div>
            </section>

            <section>
              <h3>Danger</h3>
              <button
                type="button"
                class="btn danger"
                onClick={() => {
                  if (confirm('Wipe local messages and config? Device ID is kept.')) {
                    props.onReset();
                  }
                }}
              >
                Reset local data
              </button>
            </section>
          </div>
        </aside>
      </div>
    </Show>
  );
}

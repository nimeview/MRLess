import { For, Show, type Accessor } from 'solid-js';
import type { StorageUsage } from '../features/chat/types';
import { fmtSize } from './format';
import { IconClose } from './icons';

type Props = {
  open: Accessor<boolean>;
  mobile: Accessor<boolean>;
  usage: Accessor<StorageUsage | null>;
  onClose: () => void;
  onRefresh: () => void;
  onDeleteChat: (key: string, title: string) => void;
  onDeleteFile: (fileId: string, name: string) => void;
  onPurgeFiles: () => void;
  onSaveFile: (fileId: string) => void;
};

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export function Storage(props: Props) {
  const u = () => props.usage();

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
          aria-label="Storage"
          onClick={(e) => e.stopPropagation()}
        >
          <header class="sheet-head">
            <strong>Storage</strong>
            <button type="button" class="icon-btn" aria-label="Close" onClick={() => props.onClose()}>
              <IconClose size={18} />
            </button>
          </header>

          <div class="settings-body">
            <section>
              <h3>On this device</h3>
              <dl class="info-list">
                <div>
                  <dt>Total</dt>
                  <dd>{fmtSize(u()?.total_bytes ?? 0)}</dd>
                </div>
                <div>
                  <dt>Messages</dt>
                  <dd>
                    {fmtSize(u()?.messages_bytes ?? 0)} · {u()?.message_count ?? 0}
                  </dd>
                </div>
                <div>
                  <dt>File cache</dt>
                  <dd>{fmtSize(u()?.files_bytes ?? 0)}</dd>
                </div>
                <div>
                  <dt>Other</dt>
                  <dd>{fmtSize(u()?.other_bytes ?? 0)}</dd>
                </div>
              </dl>

              <div class="usage-bars">
                <div class="usage-bar">
                  <span>Messages</span>
                  <i style={{ width: `${pct(u()?.messages_bytes ?? 0, u()?.total_bytes ?? 1)}%` }} />
                </div>
                <div class="usage-bar files">
                  <span>Files</span>
                  <i style={{ width: `${pct(u()?.files_bytes ?? 0, u()?.total_bytes ?? 1)}%` }} />
                </div>
              </div>

              <div class="sheet-actions inline">
                <button type="button" class="btn ghost" onClick={() => props.onRefresh()}>
                  Refresh
                </button>
              </div>
            </section>

            <section>
              <h3>Chats</h3>
              <Show
                when={(u()?.chats.length ?? 0) > 0}
                fallback={<p class="list-empty tight">No chat history yet</p>}
              >
                <ul class="storage-list">
                  <For each={u()?.chats ?? []}>
                    {(c) => (
                      <li>
                        <div class="storage-meta">
                          <strong>{c.title}</strong>
                          <span class="dim">
                            {c.message_count} msg · ~{fmtSize(c.approx_bytes)}
                          </span>
                        </div>
                        <button
                          type="button"
                          class="link-btn"
                          onClick={() => props.onDeleteChat(c.key, c.title)}
                        >
                          Delete
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>

            <section>
              <h3>File cache</h3>
              <div class="sheet-actions inline">
                <button
                  type="button"
                  class="btn ghost danger"
                  disabled={(u()?.files.length ?? 0) === 0}
                  onClick={() => {
                    if (confirm('Remove all cached files? Chat text stays.')) {
                      props.onPurgeFiles();
                    }
                  }}
                >
                  Purge all files
                </button>
              </div>
              <Show
                when={(u()?.files.length ?? 0) > 0}
                fallback={<p class="list-empty tight">No files in cache</p>}
              >
                <ul class="storage-list">
                  <For each={u()?.files ?? []}>
                    {(f) => (
                      <li>
                        <div class="storage-meta">
                          <strong>{f.file_name}</strong>
                          <span class="dim">{fmtSize(f.size)}</span>
                        </div>
                        <button
                          type="button"
                          class="link-btn"
                          onClick={() => props.onSaveFile(f.file_id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          class="link-btn"
                          onClick={() => props.onDeleteFile(f.file_id, f.file_name)}
                        >
                          Delete
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>
          </div>
        </aside>
      </div>
    </Show>
  );
}

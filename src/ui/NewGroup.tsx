import { For, Show, createEffect, createMemo, createSignal, type Accessor } from 'solid-js';
import type { ContactInfo, PeerInfo } from '../features/chat/types';
import { avatarTone, initials } from './format';
import { IconClose } from './icons';

type Candidate = {
  id: string;
  name: string;
  online: boolean;
};

type Props = {
  open: Accessor<boolean>;
  mobile: Accessor<boolean>;
  contacts: Accessor<ContactInfo[]>;
  peers: Accessor<PeerInfo[]>;
  myId: Accessor<string>;
  onClose: () => void;
  onCreate: (name: string, members: string[]) => void;
};

export function NewGroup(props: Props) {
  const [name, setName] = createSignal('');
  const [picked, setPicked] = createSignal<Record<string, boolean>>({});

  createEffect(() => {
    if (props.open()) {
      setName('');
      setPicked({});
    }
  });

  const candidates = createMemo((): Candidate[] => {
    const me = props.myId();
    const map = new Map<string, Candidate>();
    for (const p of props.peers()) {
      if (p.id === me) continue;
      map.set(p.id, {
        id: p.id,
        name: p.name,
        online: (p.reach ?? 'direct') !== 'offline',
      });
    }
    for (const c of props.contacts()) {
      if (c.id === me || map.has(c.id)) continue;
      map.set(c.id, { id: c.id, name: c.name, online: false });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  const selectedIds = () => Object.keys(picked()).filter((id) => picked()[id]);

  const toggle = (id: string) => {
    setPicked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const submit = (e: Event) => {
    e.preventDefault();
    const title = name().trim();
    if (!title) return;
    props.onCreate(title, selectedIds());
  };

  return (
    <Show when={props.open()}>
      <div
        class="sheet-backdrop phone-sheet-wrap"
        classList={{ mobile: props.mobile() }}
        onClick={() => props.onClose()}
      >
        <aside
          class="sheet settings-sheet phone-sheet"
          classList={{ mobile: props.mobile() }}
          role="dialog"
          aria-modal="true"
          aria-label="New group"
          onClick={(e) => e.stopPropagation()}
        >
          <header class="sheet-head">
            <strong>New group</strong>
            <button type="button" class="icon-btn" aria-label="Close" onClick={() => props.onClose()}>
              <IconClose size={18} />
            </button>
          </header>

          <form class="settings-body new-group-body" onSubmit={submit}>
            <label class="field">
              <span>Group name</span>
              <input
                value={name()}
                maxlength={32}
                placeholder="Friends"
                autocomplete="off"
                onInput={(e) => setName(e.currentTarget.value)}
              />
            </label>

            <section>
              <h3>Members</h3>
              <Show
                when={candidates().length > 0}
                fallback={<p class="list-empty tight">No contacts or peers yet</p>}
              >
                <ul class="pick-list">
                  <For each={candidates()}>
                    {(c) => (
                      <li>
                        <label class="pick-row">
                          <span class={`avatar sm ${avatarTone(c.id)}`}>
                            {initials(c.name)}
                            <Show when={c.online}>
                              <i class="online" />
                            </Show>
                          </span>
                          <span class="pick-meta">
                            <strong>{c.name}</strong>
                            <span class="dim">{c.online ? 'online' : 'saved contact'}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={!!picked()[c.id]}
                            onChange={() => toggle(c.id)}
                          />
                        </label>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>

            <div class="sheet-actions inline">
              <button type="submit" class="btn primary" disabled={!name().trim()}>
                Create group
              </button>
            </div>
          </form>
        </aside>
      </div>
    </Show>
  );
}

import { For, Show, createEffect, createMemo, createSignal, type Accessor } from 'solid-js';
import type { ChatItem, ContactInfo, PeerInfo } from '../features/chat/types';
import { avatarTone, initials } from './format';
import { IconClose } from './icons';

type Props = {
  open: Accessor<boolean>;
  chat: Accessor<ChatItem | null>;
  peers: Accessor<PeerInfo[]>;
  contacts: Accessor<ContactInfo[]>;
  myId: Accessor<string>;
  nameFor: (id: string) => string;
  mobile: Accessor<boolean>;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onUpdateMembers: (id: string, members: string[]) => void;
  onLeave: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ChatInfo(props: Props) {
  const [nameDraft, setNameDraft] = createSignal('');
  const [adding, setAdding] = createSignal(false);

  const named = () => {
    const c = props.chat();
    return !!(c && c.kind === 'group' && c.groupId && !c.lan);
  };
  const isOwner = () => named() && props.chat()?.ownerId === props.myId();

  createEffect(() => {
    const c = props.chat();
    if (props.open() && c) {
      setNameDraft(c.title);
      setAdding(false);
    }
  });

  const memberIds = () => props.chat()?.memberIds ?? [];

  const addable = createMemo(() => {
    const have = new Set(memberIds());
    const me = props.myId();
    const map = new Map<string, { id: string; name: string; online: boolean }>();
    for (const p of props.peers()) {
      if (p.id === me || have.has(p.id)) continue;
      map.set(p.id, { id: p.id, name: p.name, online: (p.reach ?? 'direct') !== 'offline' });
    }
    for (const c of props.contacts()) {
      if (c.id === me || have.has(c.id) || map.has(c.id)) continue;
      map.set(c.id, { id: c.id, name: c.name, online: false });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  const saveName = () => {
    const id = props.chat()?.groupId;
    const n = nameDraft().trim();
    if (!id || !n) return;
    props.onRename(id, n);
  };

  const removeMember = (id: string) => {
    const gid = props.chat()?.groupId;
    if (!gid) return;
    props.onUpdateMembers(
      gid,
      memberIds().filter((m) => m !== id),
    );
  };

  const addMember = (id: string) => {
    const gid = props.chat()?.groupId;
    if (!gid) return;
    props.onUpdateMembers(gid, [...memberIds(), id]);
    setAdding(false);
  };

  return (
    <Show when={props.open() && props.chat()}>
      <div
        class="info-panel-wrap phone-sheet-wrap"
        classList={{ mobile: props.mobile() }}
        onClick={() => {
          if (props.mobile()) props.onClose();
        }}
      >
        <aside
          class="info-panel phone-sheet"
          classList={{ mobile: props.mobile() }}
          onClick={(e) => e.stopPropagation()}
        >
          <header class="sheet-head">
            <strong>Info</strong>
            <button type="button" class="icon-btn" aria-label="Close" onClick={() => props.onClose()}>
              <IconClose size={18} />
            </button>
          </header>

          <Show when={props.chat()}>
            {(chat) => (
              <>
                <div class="profile-hero">
                  <span
                    class={`avatar xl ${chat().kind === 'group' ? 'group' : avatarTone(chat().key)}`}
                  >
                    {chat().kind === 'group' ? '#' : initials(chat().title)}
                  </span>
                  <h2 class="info-title">{chat().title}</h2>
                  <p class="info-sub">
                    {chat().kind === 'group'
                      ? chat().lan
                        ? 'Open LAN mesh'
                        : 'Closed group'
                      : 'Direct chat'}
                  </p>
                </div>

                <Show when={named() && isOwner()}>
                  <label class="field pad">
                    <span>Group name</span>
                    <input
                      value={nameDraft()}
                      maxlength={32}
                      onInput={(e) => setNameDraft(e.currentTarget.value)}
                    />
                  </label>
                  <div class="sheet-actions inline pad">
                    <button
                      type="button"
                      class="btn primary"
                      disabled={!nameDraft().trim() || nameDraft().trim() === chat().title}
                      onClick={saveName}
                    >
                      Save name
                    </button>
                  </div>
                </Show>

                <dl class="info-list">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      {chat().kind === 'group'
                        ? chat().online
                          ? 'Mesh online'
                          : 'Node offline'
                        : chat().reach === 'direct'
                          ? 'Direct peer'
                          : chat().reach === 'mesh'
                            ? 'Reachable via mesh'
                            : 'Offline'}
                    </dd>
                  </div>
                  <Show when={!named()}>
                    <div>
                      <dt>{chat().kind === 'group' ? 'Scope' : 'Address'}</dt>
                      <dd class="mono">{chat().subtitle}</dd>
                    </div>
                  </Show>
                  <Show when={chat().kind === 'dm' && chat().peerId}>
                    <div>
                      <dt>Peer ID</dt>
                      <dd class="mono">{chat().peerId}</dd>
                    </div>
                  </Show>
                </dl>

                <Show when={chat().kind === 'group' && chat().lan}>
                  <section class="members">
                    <h3>Peers on mesh</h3>
                    <Show
                      when={props.peers().length > 0}
                      fallback={<p class="list-empty tight">No peers discovered yet</p>}
                    >
                      <ul>
                        <For each={props.peers()}>
                          {(p) => (
                            <li>
                              <span class={`avatar sm ${avatarTone(p.id)}`}>
                                {initials(p.name)}
                                <Show when={(p.reach ?? 'direct') !== 'offline'}>
                                  <i class="online" classList={{ mesh: p.reach === 'mesh' }} />
                                </Show>
                              </span>
                              <div>
                                <strong>{p.name}</strong>
                                <span class="mono dim">{p.addr}</span>
                              </div>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>
                  </section>
                </Show>

                <Show when={named()}>
                  <section class="members">
                    <h3>Members · {memberIds().length}</h3>
                    <ul>
                      <For each={memberIds()}>
                        {(id) => {
                          const live = () => props.peers().find((p) => p.id === id);
                          const label = () =>
                            id === props.myId() ? `${props.nameFor(id)} (you)` : props.nameFor(id);
                          return (
                            <li>
                              <span class={`avatar sm ${avatarTone(id)}`}>
                                {initials(label())}
                                <Show when={!!live() && (live()!.reach ?? 'direct') !== 'offline'}>
                                  <i class="online" classList={{ mesh: live()?.reach === 'mesh' }} />
                                </Show>
                              </span>
                              <div>
                                <strong>{label()}</strong>
                                <span class="dim">
                                  {id === chat().ownerId ? 'owner' : live() ? 'on mesh' : 'member'}
                                </span>
                              </div>
                              <Show when={isOwner() && id !== props.myId()}>
                                <button
                                  type="button"
                                  class="link-btn"
                                  onClick={() => removeMember(id)}
                                >
                                  Remove
                                </button>
                              </Show>
                            </li>
                          );
                        }}
                      </For>
                    </ul>

                    <Show when={isOwner()}>
                      <Show
                        when={adding()}
                        fallback={
                          <button type="button" class="btn ghost" onClick={() => setAdding(true)}>
                            Add member
                          </button>
                        }
                      >
                        <Show
                          when={addable().length > 0}
                          fallback={<p class="list-empty tight">Everyone you know is already in</p>}
                        >
                          <ul class="pick-list">
                            <For each={addable()}>
                              {(c) => (
                                <li>
                                  <button type="button" class="pick-row" onClick={() => addMember(c.id)}>
                                    <span class={`avatar sm ${avatarTone(c.id)}`}>
                                      {initials(c.name)}
                                    </span>
                                    <span class="pick-meta">
                                      <strong>{c.name}</strong>
                                      <span class="dim">{c.online ? 'online' : 'contact'}</span>
                                    </span>
                                  </button>
                                </li>
                              )}
                            </For>
                          </ul>
                        </Show>
                      </Show>
                    </Show>

                    <div class="sheet-actions inline">
                      <Show
                        when={isOwner()}
                        fallback={
                          <button
                            type="button"
                            class="btn ghost danger"
                            onClick={() => {
                              const id = chat().groupId;
                              if (!id) return;
                              if (!confirm('Leave this group?')) return;
                              props.onLeave(id);
                            }}
                          >
                            Leave group
                          </button>
                        }
                      >
                        <button
                          type="button"
                          class="btn ghost danger"
                          onClick={() => {
                            const id = chat().groupId;
                            if (!id) return;
                            if (!confirm('Delete this group for everyone?')) return;
                            props.onDelete(id);
                          }}
                        >
                          Delete group
                        </button>
                      </Show>
                    </div>
                  </section>
                </Show>
              </>
            )}
          </Show>
        </aside>
      </div>
    </Show>
  );
}

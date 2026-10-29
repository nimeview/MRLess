import { For, Show, type Accessor } from 'solid-js';
import type { ChatItem, ChatTab, GlobalHit, NodeHello } from '../features/chat/types';
import { avatarTone, fmtTime, initials } from './format';
import { IconClose, IconPlus, IconSearch } from './icons';

type Props = {
  chats: Accessor<ChatItem[]>;
  globalHits: Accessor<GlobalHit[]>;
  searching: Accessor<boolean>;
  peerCount: Accessor<number>;
  activeKey: Accessor<string>;
  tab: Accessor<ChatTab>;
  query: Accessor<string>;
  connected: Accessor<boolean>;
  status: Accessor<string>;
  hello: Accessor<NodeHello | null>;
  avatars: Accessor<Record<string, string>>;
  onTab: (tab: ChatTab) => void;
  onQuery: (q: string) => void;
  onOpenChat: (key: string) => void;
  onOpenGlobal: (hit: GlobalHit) => void;
  onOpenProfile: () => void;
  onNewGroup: () => void;
};

function ChatRow(props: {
  item: ChatItem;
  active: boolean;
  avatarUrl?: string | null;
  onOpen: () => void;
}) {
  const c = () => props.item;
  return (
    <button
      type="button"
      class="chat-row"
      data-chat-key={c().key}
      classList={{ active: props.active }}
      onClick={() => props.onOpen()}
    >
      <Show
        when={c().kind === 'dm' && props.avatarUrl}
        fallback={
          <span class={`avatar ${c().kind === 'group' ? 'group' : avatarTone(c().key)}`}>
            {c().kind === 'group' ? '#' : initials(c().title)}
            <Show when={c().kind === 'dm' && c().online}>
              <i class="online" classList={{ mesh: c().reach === 'mesh' }} />
            </Show>
          </span>
        }
      >
        <span class="avatar photo-wrap">
          <img class="avatar photo" src={props.avatarUrl!} alt="" draggable={false} />
          <Show when={c().online}>
            <i class="online" classList={{ mesh: c().reach === 'mesh' }} />
          </Show>
        </span>
      </Show>
      <span class="chat-meta">
        <span class="chat-top">
          <span class="chat-title">{c().title}</span>
          <Show when={c().lastTs > 0}>
            <time>{fmtTime(c().lastTs)}</time>
          </Show>
        </span>
        <span class="chat-preview">
          <Show when={c().kind === 'group'}>
            <em class="badge">{c().lan ? 'mesh' : 'group'}</em>
          </Show>
          {c().lastBody}
        </span>
      </span>
    </button>
  );
}

export function ChatList(props: Props) {
  const me = () => props.hello()?.node_id ?? 'me';
  const name = () => props.hello()?.name || 'MR';
  const hasLocal = () => props.chats().length > 0;
  const hasGlobal = () => props.searching() && props.globalHits().length > 0;
  const empty = () =>
    props.searching()
      ? !hasLocal() && !hasGlobal()
      : props.chats().length === 0;

  return (
    <aside class="sidebar">
      <header class="sidebar-head">
        <button
          type="button"
          class="avatar-btn"
          title="Settings"
          aria-label="Settings"
          onClick={() => props.onOpenProfile()}
        >
          <Show
            when={props.avatars()[me()]}
            fallback={
              <span class={`avatar sm ${avatarTone(me())}`}>{initials(name())}</span>
            }
          >
            <img
              class="avatar sm photo"
              src={props.avatars()[me()]}
              alt=""
              draggable={false}
            />
          </Show>
        </button>
        <div class="brand-block">
          <strong>MRLess</strong>
          <span class={`mesh-dot ${props.connected() ? 'on' : ''}`}>
            {props.connected()
              ? props.peerCount() > 0
                ? `mesh · ${props.peerCount()} nearby`
                : 'mesh · alone on LAN'
              : 'local node offline'}
          </span>
        </div>
      </header>

      <div class="search-wrap">
        <div class="search-field">
          <span class="search-ico" aria-hidden="true">
            <IconSearch size={16} />
          </span>
          <input
            class="search"
            placeholder="Search chats and people"
            value={props.query()}
            onInput={(e) => props.onQuery(e.currentTarget.value)}
            autocomplete="off"
            spellcheck={false}
          />
          <Show when={props.query().trim()}>
            <button
              type="button"
              class="search-clear"
              aria-label="Clear search"
              onClick={() => props.onQuery('')}
            >
              <IconClose size={14} />
            </button>
          </Show>
        </div>
      </div>

      <Show when={!props.searching()}>
        <div class="tabs" role="tablist">
          <button
            type="button"
            classList={{ active: props.tab() === 'all' }}
            onClick={() => props.onTab('all')}
          >
            All
          </button>
          <button
            type="button"
            classList={{ active: props.tab() === 'groups' }}
            onClick={() => props.onTab('groups')}
          >
            Groups
          </button>
          <button
            type="button"
            classList={{ active: props.tab() === 'direct' }}
            onClick={() => props.onTab('direct')}
          >
            Personal
          </button>
        </div>
      </Show>

      <div class="chat-list">
        <Show when={props.searching() && hasLocal()}>
          <div class="search-section-label">Chats</div>
        </Show>

        <For each={props.chats()}>
          {(c) => (
            <ChatRow
              item={c}
              active={props.activeKey() === c.key}
              avatarUrl={c.kind === 'dm' ? props.avatars()[c.key] : null}
              onOpen={() => props.onOpenChat(c.key)}
            />
          )}
        </For>

        <Show when={hasGlobal()}>
          <div class="search-divider" role="separator">
            <span>Global search</span>
          </div>
          <For each={props.globalHits()}>
            {(hit) => (
              <button
                type="button"
                class="chat-row global-hit"
                classList={{ active: props.activeKey() === hit.id }}
                onClick={() => props.onOpenGlobal(hit)}
              >
                <Show
                  when={props.avatars()[hit.id]}
                  fallback={
                    <span class={`avatar ${avatarTone(hit.id)}`}>
                      {initials(hit.name)}
                      <Show when={hit.online}>
                        <i class="online" />
                      </Show>
                    </span>
                  }
                >
                  <span class="avatar photo-wrap">
                    <img
                      class="avatar photo"
                      src={props.avatars()[hit.id]}
                      alt=""
                      draggable={false}
                    />
                    <Show when={hit.online}>
                      <i class="online" />
                    </Show>
                  </span>
                </Show>
                <span class="chat-meta">
                  <span class="chat-top">
                    <span class="chat-title">{hit.name}</span>
                    <Show when={hit.online}>
                      <em class="online-tag">online</em>
                    </Show>
                  </span>
                  <span class="chat-preview">{hit.subtitle}</span>
                </span>
              </button>
            )}
          </For>
        </Show>

        <Show when={empty()}>
          <div class="list-empty-block">
            <p class="list-empty">
              {props.searching()
                ? props.peerCount() === 0
                  ? 'Nobody on the mesh yet'
                  : 'No chats or people match'
                : 'No chats yet'}
            </p>
          </div>
        </Show>

        <Show when={props.searching() && hasLocal() && !hasGlobal()}>
          <div class="search-divider muted" role="separator">
            <span>
              {props.peerCount() === 0 ? 'Waiting for mesh neighbors' : 'No other people on mesh'}
            </span>
          </div>
        </Show>
      </div>

      <button
        type="button"
        class="fab-new"
        aria-label="New group"
        title="New group"
        onClick={() => props.onNewGroup()}
      >
        <IconPlus size={22} />
      </button>

      <footer class="sidebar-foot" title={props.status()}>
        {props.status()}
      </footer>
    </aside>
  );
}

import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type Accessor,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import type { ChatItem, ChatMessage, FileOffer } from '../features/chat/types';
import { avatarTone, initials } from './format';
import { IconAttach, IconBack, IconClose, IconPhone, IconSend, IconVideo } from './icons';
import { FileBubble, MessageBubble, type MsgAction } from './MessageBubble';

type Props = {
  chat: Accessor<ChatItem | null>;
  messages: Accessor<ChatMessage[]>;
  files: Accessor<FileOffer[]>;
  draft: Accessor<string>;
  myId: Accessor<string>;
  connected: Accessor<boolean>;
  replyTo: Accessor<ChatMessage | null>;
  editing: Accessor<ChatMessage | null>;
  previews: Accessor<Record<string, string>>;
  avatars: Accessor<Record<string, string>>;
  onDraft: (v: string) => void;
  onBack: () => void;
  onOpenInfo: () => void;
  onSend: (e: Event) => void;
  onPickFile: (e: Event) => void;
  onRequestFile: (fileId: string, from: string) => void;
  onSaveFile: (fileId: string) => void;
  onOpenImage: (fileId: string) => void;
  onResend: (id: string) => void;
  onMsgAction: (action: MsgAction, message: ChatMessage) => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onCallStub: (kind: 'voice' | 'video') => void;
};

type TimelineItem =
  | { kind: 'msg'; ts: number; id: string; msg: ChatMessage }
  | { kind: 'file'; ts: number; id: string; file: FileOffer };

type MenuState = {
  msg: ChatMessage;
  x: number;
  y: number;
};

const MENU_W = 168;
const MENU_H = 240;

function placeMenu(anchor: DOMRect, mine: boolean): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = mine ? anchor.right - MENU_W : anchor.left;
  let y = anchor.bottom + 6;
  x = Math.max(8, Math.min(x, vw - MENU_W - 8));
  if (y + MENU_H > vh - 8) {
    y = anchor.top - MENU_H - 6;
  }
  y = Math.max(8, Math.min(y, vh - MENU_H - 8));
  return { x, y };
}

export function ChatThread(props: Props) {
  let threadRef: HTMLDivElement | undefined;
  let fileInput: HTMLInputElement | undefined;
  const [menu, setMenu] = createSignal<MenuState | null>(null);

  const timeline = createMemo((): TimelineItem[] => {
    const items: TimelineItem[] = [
      ...props.messages().map((msg) => ({ kind: 'msg' as const, ts: msg.ts, id: msg.id, msg })),
      ...props.files().map((file) => ({
        kind: 'file' as const,
        ts: file.ts,
        id: file.file_id,
        file,
      })),
    ];
    items.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
    return items;
  });

  const replyPreviewFor = (m: ChatMessage) => {
    if (!m.reply_to && !m.reply_snippet) return null;
    if (m.reply_snippet) {
      const who = m.reply_author?.trim() || '…';
      return `${who}: ${m.reply_snippet}`;
    }
    const src = props.messages().find((x) => x.id === m.reply_to);
    if (!src) return 'Reply';
    const who = src.mine ? 'You' : src.from_name;
    const text = src.body.length > 80 ? `${src.body.slice(0, 80)}…` : src.body;
    return `${who}: ${text}`;
  };

  const openMenu = (message: ChatMessage, anchor: DOMRect) => {
    const { x, y } = placeMenu(anchor, message.mine);
    setMenu({ msg: message, x, y });
  };

  const closeMenu = () => setMenu(null);

  const run = (action: MsgAction) => {
    const m = menu()?.msg;
    closeMenu();
    if (m) props.onMsgAction(action, m);
  };

  let lastChatKey = '';
  createEffect(() => {
    const key = props.chat()?.key ?? '';
    if (key !== lastChatKey) {
      lastChatKey = key;
      closeMenu();
    }
  });

  createEffect(() => {
    timeline();
    queueMicrotask(() => {
      if (threadRef && !menu()) threadRef.scrollTop = threadRef.scrollHeight;
    });
  });

  createEffect(() => {
    if (!menu() || !threadRef) return;
    const onScroll = () => closeMenu();
    threadRef.addEventListener('scroll', onScroll, { passive: true });
    onCleanup(() => threadRef?.removeEventListener('scroll', onScroll));
  });

  return (
    <main class="thread">
      <Show when={props.chat()} fallback={<div class="thread-empty">Select a chat</div>}>
        {(chat) => (
          <>
            <header class="thread-head">
              <button
                type="button"
                class="icon-btn back"
                aria-label="Back"
                onClick={() => props.onBack()}
              >
                <IconBack size={20} />
              </button>

              <button
                type="button"
                class="thread-peer"
                onClick={() => props.onOpenInfo()}
                title="Chat info"
              >
                <Show
                  when={chat().kind === 'dm' && props.avatars()[chat().key]}
                  fallback={
                    <span
                      class={`avatar md ${chat().kind === 'group' ? 'group' : avatarTone(chat().key)}`}
                    >
                      {chat().kind === 'group' ? '#' : initials(chat().title)}
                    </span>
                  }
                >
                  <img
                    class="avatar md photo"
                    src={props.avatars()[chat().key]}
                    alt=""
                    draggable={false}
                  />
                </Show>
                <div class="thread-titles">
                  <strong>{chat().title}</strong>
                  <span>
                    {chat().kind === 'group'
                      ? chat().subtitle
                      : chat().reach === 'direct'
                        ? `direct · ${chat().subtitle}`
                        : chat().reach === 'mesh'
                          ? `via mesh · ${chat().subtitle}`
                          : chat().online
                            ? `online · ${chat().subtitle}`
                            : chat().subtitle || 'offline'}
                  </span>
                </div>
              </button>

              <div class="thread-actions desktop-only">
                <button
                  type="button"
                  class="icon-btn"
                  title="Voice call — soon"
                  onClick={() => props.onCallStub('voice')}
                >
                  <IconPhone size={20} />
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  title="Video call — soon"
                  onClick={() => props.onCallStub('video')}
                >
                  <IconVideo size={20} />
                </button>
              </div>
            </header>

            <div class="messages" ref={threadRef}>
              <div class="messages-inner">
                <Show when={timeline().length === 0}>
                  <div class="thread-empty-state">
                    <Show
                      when={chat().kind === 'dm' && props.avatars()[chat().key]}
                      fallback={
                        <span
                          class={`avatar xl ${chat().kind === 'group' ? 'group' : avatarTone(chat().key)}`}
                        >
                          {chat().kind === 'group' ? '#' : initials(chat().title)}
                        </span>
                      }
                    >
                      <img
                        class="avatar xl photo"
                        src={props.avatars()[chat().key]}
                        alt=""
                        draggable={false}
                      />
                    </Show>
                    <strong>{chat().title}</strong>
                  </div>
                </Show>

                <For each={timeline()}>
                  {(item, i) => {
                    if (item.kind === 'file') {
                      const f = item.file;
                      return (
                        <FileBubble
                          file={f}
                          mine={f.from === props.myId()}
                          previewUrl={props.previews()[f.file_id]}
                          onGet={
                            f.local
                              ? undefined
                              : () => props.onRequestFile(f.file_id, f.from)
                          }
                          onSave={
                            f.local ? () => props.onSaveFile(f.file_id) : undefined
                          }
                          onOpenPreview={
                            f.local ? () => props.onOpenImage(f.file_id) : undefined
                          }
                        />
                      );
                    }
                    const m = item.msg;
                    const prev = () => {
                      const p = timeline()[i() - 1];
                      return p?.kind === 'msg' ? p.msg : undefined;
                    };
                    const stacked = () =>
                      !!prev() && prev()!.from === m.from && m.ts - prev()!.ts < 120;
                    const namedOrLan = () => chat().kind === 'group';
                    const showSender = () => namedOrLan() && !m.mine && !stacked();
                    const showAvatar = () => namedOrLan() && !m.mine && !stacked();
                    const avatarColumn = () => namedOrLan() && !m.mine;
                    return (
                      <MessageBubble
                        message={m}
                        replyPreview={replyPreviewFor(m)}
                        showSender={showSender()}
                        showAvatar={showAvatar()}
                        avatarColumn={avatarColumn()}
                        avatarUrl={props.avatars()[m.from]}
                        stacked={stacked()}
                        menuOpen={menu()?.msg.id === m.id}
                        onResend={props.onResend}
                        onOpenMenu={openMenu}
                      />
                    );
                  }}
                </For>
              </div>
            </div>

            <Show when={props.replyTo() || props.editing()}>
              <div class="composer-banner">
                <div class="composer-banner-text">
                  <strong>{props.editing() ? 'Editing' : 'Reply'}</strong>
                  <span>
                    {(props.editing() ?? props.replyTo())?.body.slice(0, 100) || ''}
                  </span>
                </div>
                <button
                  type="button"
                  class="icon-btn"
                  aria-label="Cancel"
                  onClick={() =>
                    props.editing() ? props.onCancelEdit() : props.onCancelReply()
                  }
                >
                  <IconClose size={16} />
                </button>
              </div>
            </Show>

            <form class="composer" onSubmit={(e) => props.onSend(e)}>
              <button
                type="button"
                class="icon-btn attach"
                title="Attach"
                disabled={!props.connected() || !!props.editing()}
                onClick={() => fileInput?.click()}
              >
                <IconAttach size={22} />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="*/*"
                hidden
                onChange={(e) => props.onPickFile(e)}
              />
              <div class="composer-field">
                <input
                  value={props.draft()}
                  onInput={(e) => props.onDraft(e.currentTarget.value)}
                  placeholder={
                    props.editing()
                      ? 'Edit message'
                      : props.connected()
                        ? chat().kind === 'dm' && !chat().online
                          ? 'Queued until they are reachable'
                          : 'Message'
                        : 'Local node offline'
                  }
                  autocomplete="off"
                  disabled={!props.connected()}
                />
              </div>
              <button
                type="submit"
                class="send-btn"
                disabled={!props.connected() || !props.draft().trim()}
                aria-label="Send"
              >
                <IconSend size={18} />
              </button>
            </form>
          </>
        )}
      </Show>

      <Show when={menu()}>
        {(m) => (
          <Portal>
            <div
              class="msg-menu-layer"
              onPointerDown={(e) => {
                e.preventDefault();
                closeMenu();
              }}
            >
              <div
                class="msg-menu floating"
                classList={{ mine: m().msg.mine }}
                style={{
                  left: `${m().x}px`,
                  top: `${m().y}px`,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button type="button" onClick={() => run('copy')}>
                  Copy
                </button>
                <button type="button" onClick={() => run('reply')}>
                  Reply
                </button>
                <button type="button" onClick={() => run('forward')}>
                  Forward
                </button>
                <Show when={m().msg.mine}>
                  <button type="button" onClick={() => run('edit')}>
                    Edit
                  </button>
                  <button type="button" class="danger" onClick={() => run('delete')}>
                    Delete
                  </button>
                </Show>
                <Show when={!m().msg.mine}>
                  <button type="button" class="danger" onClick={() => run('delete')}>
                    Delete locally
                  </button>
                </Show>
              </div>
            </div>
          </Portal>
        )}
      </Show>
    </main>
  );
}

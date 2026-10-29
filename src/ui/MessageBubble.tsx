import { Show, onCleanup } from 'solid-js';
import type { ChatMessage, DeliveryStatus, FileOffer } from '../features/chat/types';
import { avatarTone, fmtTime, initials } from './format';

export type MsgAction = 'copy' | 'reply' | 'forward' | 'edit' | 'delete';

type MsgProps = {
  message: ChatMessage;
  replyPreview?: string | null;
  showSender: boolean;
  showAvatar: boolean;
  avatarColumn?: boolean;
  /** Photo URL for the sender avatar (optional). */
  avatarUrl?: string | null;
  stacked: boolean;
  menuOpen?: boolean;
  onResend?: (id: string) => void;
  onOpenMenu?: (message: ChatMessage, anchor: DOMRect) => void;
};

function Tick(props: { status?: DeliveryStatus }) {
  const s = () => props.status ?? 'delivered';
  return (
    <span class={`tick ${s()}`} title={s()} aria-label={s()}>
      {s() === 'queued' ? '◷' : s() === 'sent' ? '✓' : s() === 'delivered' ? '✓✓' : '!'}
    </span>
  );
}

export function MessageBubble(props: MsgProps) {
  let bubbleEl: HTMLElement | undefined;
  let pressTimer: number | undefined;
  let startX = 0;
  let startY = 0;
  const failed = () => props.message.mine && props.message.status === 'failed';

  /** Prefer fields on the message (survive status/partial updates); fall back to prop. */
  const replyQuote = () => {
    const m = props.message;
    if (m.reply_snippet) {
      const who = m.reply_author?.trim() || '…';
      return `${who}: ${m.reply_snippet}`;
    }
    if (props.replyPreview) return props.replyPreview;
    if (m.reply_to) return 'Reply';
    return '';
  };

  const clearPress = () => {
    if (pressTimer != null) {
      window.clearTimeout(pressTimer);
      pressTimer = undefined;
    }
  };

  onCleanup(clearPress);

  const openFromEl = () => {
    if (!bubbleEl || !props.onOpenMenu) return;
    props.onOpenMenu(props.message, bubbleEl.getBoundingClientRect());
  };

  return (
    <div
      class="msg-row"
      classList={{
        mine: props.message.mine,
        stacked: props.stacked,
        failed: failed(),
        'menu-open': !!props.menuOpen,
      }}
    >
      <Show when={props.showAvatar}>
        <Show
          when={props.avatarUrl}
          fallback={
            <span class={`avatar xs ${avatarTone(props.message.from)}`}>
              {initials(props.message.from_name)}
            </span>
          }
        >
          <img
            class="avatar xs photo"
            src={props.avatarUrl!}
            alt=""
            draggable={false}
          />
        </Show>
      </Show>
      <Show when={props.avatarColumn && !props.showAvatar}>
        <span class="avatar-spacer" />
      </Show>
      <article
        ref={(el) => {
          bubbleEl = el;
        }}
        class="bubble"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openFromEl();
        }}
        onTouchStart={(e) => {
          if (e.touches.length !== 1) return;
          const t = e.touches[0];
          startX = t.clientX;
          startY = t.clientY;
          clearPress();
          pressTimer = window.setTimeout(() => {
            pressTimer = undefined;
            // Stop native text selection / callout.
            window.getSelection()?.removeAllRanges();
            openFromEl();
          }, 380);
        }}
        onTouchMove={(e) => {
          if (pressTimer == null || e.touches.length !== 1) return;
          const t = e.touches[0];
          if (Math.hypot(t.clientX - startX, t.clientY - startY) > 12) clearPress();
        }}
        onTouchEnd={clearPress}
        onTouchCancel={clearPress}
      >
        <Show when={props.showSender}>
          <div class="sender">{props.message.from_name}</div>
        </Show>
        <Show when={replyQuote()}>
          <div class="reply-quote">
            <span class="reply-quote-label">Reply</span>
            <span class="reply-quote-body">{replyQuote()}</span>
          </div>
        </Show>
        <div class="bubble-body">
          <span class="text">{props.message.body}</span>
          <time>
            <Show when={props.message.edited}>
              <span class="edited">edited </span>
            </Show>
            {fmtTime(props.message.ts)}
            <Show when={props.message.mine}>
              <Tick status={props.message.status} />
            </Show>
          </time>
        </div>
        <Show when={failed() && props.onResend}>
          <button
            type="button"
            class="link-btn resend"
            onClick={() => props.onResend?.(props.message.id)}
          >
            Resend
          </button>
        </Show>
      </article>
    </div>
  );
}

type FileProps = {
  file: FileOffer;
  mine: boolean;
  previewUrl?: string | null;
  onGet?: () => void;
  onSave?: () => void;
  onOpenPreview?: () => void;
};

function isImageName(name: string) {
  return /\.(png|jpe?g|gif|webp|heic|bmp)$/i.test(name);
}

export function FileBubble(props: FileProps) {
  const image = () => isImageName(props.file.file_name);
  return (
    <div class="msg-row" classList={{ mine: props.mine }}>
      <article class="bubble file-bubble" classList={{ 'has-preview': !!props.previewUrl }}>
        <Show when={props.previewUrl && image()}>
          <button
            type="button"
            class="img-preview-btn"
            onClick={() => props.onOpenPreview?.() ?? props.onSave?.()}
          >
            <img src={props.previewUrl!} alt={props.file.file_name} class="img-preview" />
          </button>
        </Show>
        <div class="file-card">
          <Show when={!props.previewUrl}>
            <span class="file-ico">{image() ? 'IMG' : 'F'}</span>
          </Show>
          <div class="file-meta">
            <strong>{props.file.file_name}</strong>
            <span>{(props.file.size / 1024).toFixed(1)} KB</span>
          </div>
          <Show when={!props.file.local && props.onGet}>
            <button type="button" class="link-btn" onClick={() => props.onGet?.()}>
              Get
            </button>
          </Show>
          <Show when={props.file.local && props.onSave}>
            <button type="button" class="link-btn" onClick={() => props.onSave?.()}>
              Save
            </button>
          </Show>
        </div>
        <time>{fmtTime(props.file.ts)}</time>
      </article>
    </div>
  );
}

export { isImageName };

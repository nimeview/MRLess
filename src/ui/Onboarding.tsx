import { createSignal, type Accessor } from 'solid-js';

type Props = {
  nodeId: Accessor<string>;
  initialName: Accessor<string>;
  onComplete: (name: string) => void;
};

export function Onboarding(props: Props) {
  const [name, setName] = createSignal(props.initialName() === 'node' ? '' : props.initialName());

  const submit = (e: Event) => {
    e.preventDefault();
    const n = name().trim();
    if (!n) return;
    props.onComplete(n);
  };

  return (
    <div class="onboard">
      <div class="onboard-card">
        <div class="onboard-mark">MR</div>
        <h1>MRLess</h1>
        <form onSubmit={submit}>
          <label class="field">
            <span>Display name</span>
            <input
              value={name()}
              maxlength={32}
              autofocus
              placeholder="Alice"
              onInput={(e) => setName(e.currentTarget.value)}
            />
          </label>
          <p class="mono dim onboard-id">{props.nodeId() || '…'}</p>
          <button type="submit" class="btn primary" disabled={!name().trim()}>
            Start
          </button>
        </form>
      </div>
    </div>
  );
}

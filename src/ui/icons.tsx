import type { JSX } from 'solid-js';

type IconProps = {
  size?: number;
  class?: string;
};

function svg(
  props: IconProps,
  path: JSX.Element,
  viewBox = '0 0 24 24',
): JSX.Element {
  const s = props.size ?? 22;
  return (
    <svg
      class={props.class}
      width={s}
      height={s}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export function IconBack(props: IconProps) {
  return svg(
    props,
    <path
      d="M15 18 9 12l6-6"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />,
  );
}

export function IconSearch(props: IconProps) {
  return svg(
    props,
    <>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" />
      <path d="m16 16 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </>,
  );
}

export function IconPhone(props: IconProps) {
  return svg(
    props,
    <path
      d="M7.5 3.5h3l1.2 4-2 1.2a12 12 0 0 0 5.6 5.6l1.2-2 4 1.2v3A2 2 0 0 1 18.5 18.5 14.5 14.5 0 0 1 3.5 3.5 2 2 0 0 1 5.5 1.5"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linejoin="round"
    />,
  );
}

export function IconVideo(props: IconProps) {
  return svg(
    props,
    <>
      <rect
        x="3"
        y="6"
        width="12"
        height="12"
        rx="2.5"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <path
        d="m15 10 5-2.5v9L15 14"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
    </>,
  );
}

export function IconAttach(props: IconProps) {
  return svg(
    props,
    <path
      d="M15.5 7.5 8.2 14.8a3 3 0 1 0 4.2 4.2l8.1-8.1a4.5 4.5 0 0 0-6.4-6.4L6 12.6"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    />,
  );
}

export function IconSend(props: IconProps) {
  return svg(
    props,
    <path
      d="M3.4 20.6 21 12 3.4 3.4 3 10.3 15 12 3 13.7z"
      fill="currentColor"
    />,
  );
}

export function IconClose(props: IconProps) {
  return svg(
    props,
    <path
      d="M6 6 18 18M18 6 6 18"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />,
  );
}

export function IconPlus(props: IconProps) {
  return svg(
    props,
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />,
  );
}

export function IconMore(props: IconProps) {
  return svg(
    props,
    <>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </>,
  );
}

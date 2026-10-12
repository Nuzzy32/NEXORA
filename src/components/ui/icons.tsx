import type { ReactNode } from "react";

// 20px line icons, one stroke style everywhere (1.5px, round joins). Decorative: always aria-hidden.
const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="5.5" height="5.5" rx="1.25" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.25" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.25" />
      <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.25" />
    </>
  ),
  tasks: (
    <>
      <circle cx="10" cy="10" r="7.25" />
      <path d="m6.75 10.25 2.25 2.25 4.25-4.75" />
    </>
  ),
  projects: (
    <path d="M2.75 5.5A1.75 1.75 0 0 1 4.5 3.75h3.2l1.6 1.75h6.2a1.75 1.75 0 0 1 1.75 1.75v7.25a1.75 1.75 0 0 1-1.75 1.75h-11A1.75 1.75 0 0 1 2.75 14.5Z" />
  ),
  search: (
    <>
      <circle cx="9" cy="9" r="5.25" />
      <path d="m13 13 3.5 3.5" />
    </>
  ),
  logout: (
    <>
      <path d="M8 3.75H5.25a1.5 1.5 0 0 0-1.5 1.5v9.5a1.5 1.5 0 0 0 1.5 1.5H8" />
      <path d="M12.5 6.5 16 10l-3.5 3.5M16 10H8" />
    </>
  ),
  note: (
    <>
      <path d="M5.5 3.75h6.2l3.8 3.85v8.65a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1Z" />
      <path d="M11.5 3.75V7.6h4M7 11h6M7 14h4" />
    </>
  ),
  inbox: (
    <>
      <path d="m3.5 11.5 2.1-6.4A1.5 1.5 0 0 1 7 4.1h6a1.5 1.5 0 0 1 1.4 1l2.1 6.4" />
      <path d="M3.5 11.5h3.2l.8 1.8h5l.8-1.8h3.2v3.25a1.5 1.5 0 0 1-1.5 1.5h-10a1.5 1.5 0 0 1-1.5-1.5Z" />
    </>
  ),
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  arrowRight: <path d="M4.5 10h11M11 5.5 15.5 10 11 14.5" />,
  memory: (
    <>
      <ellipse cx="10" cy="5" rx="6" ry="2.25" />
      <path d="M4 5v10c0 1.25 2.7 2.25 6 2.25s6-1 6-2.25V5M4 10c0 1.25 2.7 2.25 6 2.25s6-1 6-2.25" />
    </>
  ),
  ai: (
    <>
      <path d="M10 3.5 11.6 8l4.4 1.6-4.4 1.6L10 15.7l-1.6-4.5L4 9.6 8.4 8Z" />
      <path d="M15.5 3v2.5M14.25 4.25h2.5" />
    </>
  ),
  send: <path d="M16.5 3.5 8.5 11.5M16.5 3.5l-5 13-3-5-5-3Z" />,
  pin: <path d="m11.5 3.5 5 5-2 .75-3 3-.25 3.5-1-1-3-3-3.5 3.5M7.5 8.5l-.75-2 2-2" />,
  copy: (
    <>
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </>
  ),
  chevronDown: <path d="m5.5 8 4.5 4.5L14.5 8" />,
  filter: <path d="M3.5 5.5h13M6 10h8M8.5 14.5h3" />,
  flag: <path d="M5 17V3.5M5 4h9.5l-2 3.25 2 3.25H5" />,
  clock: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4.25l2.75 1.75" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="1.75" />
      <path d="M3.5 8.5h13M7 3v3M13 3v3" />
    </>
  ),
  list: <path d="M7 5.5h9.5M7 10h9.5M7 14.5h9.5M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01" />,
  warning: (
    <>
      <path d="M10 3.75 17 16H3Z" />
      <path d="M10 8.5v3.5M10 14h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M10 2.75 16 5v4.75c0 3.5-2.4 6-6 7.5-3.6-1.5-6-4-6-7.5V5Z" />
      <path d="m7.25 10 2 2 3.5-3.75" />
    </>
  ),
  close: <path d="m5 5 10 10M15 5 5 15" />,
  edit: <path d="M12.5 4.5 15.5 7.5M4 16l.75-3.5 8.5-8.5 2.75 2.75-8.5 8.5Z" />,
  trash: <path d="M4.5 6h11M8 6V4.25h4V6M5.75 6l.6 9.5a1 1 0 0 0 1 .95h5.3a1 1 0 0 0 1-.95l.6-9.5" />,
  check: <path d="m4.5 10.5 3.5 3.5 7.5-8" />,
  link: (
    <>
      <path d="M8.5 11.5a3 3 0 0 0 4.25 0l2.5-2.5a3 3 0 0 0-4.25-4.25l-.75.75" />
      <path d="M11.5 8.5a3 3 0 0 0-4.25 0l-2.5 2.5a3 3 0 0 0 4.25 4.25l.75-.75" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 4.5v5.25l7 7 6-6-7-7H4.5a1 1 0 0 0-1 1Z" />
      <path d="M7 7.5h.01" />
    </>
  ),
  settings: (
    <>
      <path d="M3.5 6h7M15 6h1.5M3.5 14h1.5M9.5 14h7" />
      <circle cx="12.75" cy="6" r="2.25" />
      <circle cx="7.25" cy="14" r="2.25" />
    </>
  ),
  menu: <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}

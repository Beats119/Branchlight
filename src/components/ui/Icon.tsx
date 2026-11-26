export type IconName =
  | 'branch'
  | 'arrow'
  | 'close'
  | 'sun'
  | 'moon'
  | 'book'
  | 'chevron'
  | 'check'
  | 'help'
  | 'download'
  | 'focus'
  | 'leaf';
const paths: Record<IconName, React.ReactNode> = {
  branch: (
    <>
      <path d="M6 3v12a4 4 0 0 0 4 4h7M6 11h5a5 5 0 0 0 5-5V3" />
      <circle cx="6" cy="3" r="2" />
      <circle cx="17" cy="19" r="2" />
      <circle cx="16" cy="3" r="2" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
  book: (
    <>
      <path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3m0 3h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  focus: <path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5M9 12h6m-3-3v6" />,
  leaf: (
    <>
      <path d="M12 21V9m0 7C5 16 3 11 4 5c5 0 8 3 8 7m0 0c0-5 3-8 8-9 1 6-1 11-8 12" />
    </>
  ),
};
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

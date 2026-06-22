// Inline SVG icons for the demo UI (no emoji). The shipped components ship their own icons in
// @txshield/react; these are just for the playground chrome (wallet card, swap machine, etc.).

interface P {
  size?: number;
  className?: string;
  title?: string;
}

const base = (title: string, size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  role: "img",
  "aria-label": title,
});

export const ShieldIcon = ({ size, className, title = "Shield" }: P = {}) => (
  <svg {...base(title, size)} className={className}>
    <title>{title}</title>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const FlipIcon = ({ size, className, title = "Flip" }: P = {}) => (
  <svg {...base(title, size)} className={className}>
    <title>{title}</title>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

export const RefreshIcon = ({ size, className, title = "Refresh" }: P = {}) => (
  <svg {...base(title, size)} className={className}>
    <title>{title}</title>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const KeyIcon = ({ size, className, title = "Key" }: P = {}) => (
  <svg {...base(title, size)} className={className}>
    <title>{title}</title>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

export const CopyIcon = ({ size, className, title = "Copy" }: P = {}) => (
  <svg {...base(title, size)} className={className}>
    <title>{title}</title>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const AlertIcon = ({ size, className, title = "Alert" }: P = {}) => (
  <svg {...base(title, size)} className={className}>
    <title>{title}</title>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const SendIcon = ({ size, className, title = "Send" }: P = {}) => (
  <svg {...base(title, size)} className={className}>
    <title>{title}</title>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const DownloadIcon = ({ size, className, title = "Download" }: P = {}) => (
  <svg {...base(title, size)} className={className}>
    <title>{title}</title>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

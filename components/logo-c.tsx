// La "C" del logo dell'app: C bianca bordata di verde su campo a strisce (es. accanto a The Cap Pro).
export function LogoC({ size = 22 }: { size?: number }) {
  const c = 'M8.2 5.5h7.6l2.7 2.7v2.4h-4.2V9.3h-3.6v5.4h3.6v-1.3h4.2v2.4l-2.7 2.7H8.2l-2.7-2.7V8.2z'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0 drop-shadow-sm">
      <defs>
        <clipPath id="logo-c-angoli">
          <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" />
        </clipPath>
      </defs>
      {/* campo a strisce con gli angoli arrotondati */}
      <g clipPath="url(#logo-c-angoli)">
        <rect width="24" height="24" fill="#2a9d46" />
        <path d="M4 0h4v24H4zM12 0h4v24h-4zM20 0h4v24h-4z" fill="#1f8a3c" />
      </g>
      {/* bordo: verde scuro fuori, filo chiaro dentro */}
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill="none" stroke="#14532d" strokeWidth="1" />
      <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.75" />
      {/* la C come una lettera da maglia: contorno bianco, poi verde, poi il pieno bianco */}
      <path d={c} fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinejoin="round" />
      <path d={c} fill="#ffffff" stroke="#166534" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  )
}

// Chi ha l'abbonamento Pro: la C con la scritta PRO accanto.
export function MarchioPro({ size = 16 }: { size?: number }) {
  return (
    <span title="The Cap Pro" className="inline-flex shrink-0 items-center gap-0.5">
      <LogoC size={size} />
      <span className="rounded bg-amber-400 px-1 text-[9px] font-extrabold leading-[14px] text-zinc-900">PRO</span>
    </span>
  )
}

// Gli organizzatori (admin) di una lega: pallino arancione con la "A".
export function PallinoAdmin({ size = 20, title = 'Organizzatore' }: { size?: number; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      A
    </span>
  )
}

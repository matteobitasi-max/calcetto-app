import { LogoC } from './logo-c'

// Gli organizzatori (admin) di una lega: la "C" del logo.
export function PallinoAdmin({ size = 20, title = 'Organizzatore' }: { size?: number; title?: string }) {
  return (
    <span title={title} className="inline-flex shrink-0">
      <LogoC size={size} />
    </span>
  )
}

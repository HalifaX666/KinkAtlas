import { Compass } from 'lucide-react'

export function BrandLogo({ size = 'header' }: { size?: 'header' | 'footer' }) {
  return <span className={`brand-logo brand-logo-${size}`} data-testid={`brand-logo-${size}`}>
    <Compass aria-hidden="true" />
    <span>Kink <i>Atlas</i></span>
  </span>
}

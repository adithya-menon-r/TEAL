import { useId } from "react"

// Cloud outline from simple-icons (siGooglecloud), CC0.
const PATH =
  "M12.19 2.38a9.344 9.344 0 0 0-9.234 6.893c.053-.02-.055.013 0 0-3.875 2.551-3.922 8.11-.247 10.941l.006-.007-.007.03a6.717 6.717 0 0 0 4.077 1.356h5.173l.03.03h5.192c6.687.053 9.376-8.605 3.835-12.35a9.365 9.365 0 0 0-2.821-4.552l-.043.043.006-.05A9.344 9.344 0 0 0 12.19 2.38zm-.358 4.146c1.244-.04 2.518.368 3.486 1.15a5.186 5.186 0 0 1 1.862 4.078v.518c3.53-.07 3.53 5.262 0 5.193h-5.193l-.008.009v-.04H6.785a2.59 2.59 0 0 1-1.067-.23h.001a2.597 2.597 0 1 1 3.437-3.437l3.013-3.012A6.747 6.747 0 0 0 8.11 8.24c.018-.01.04-.026.054-.023a5.186 5.186 0 0 1 3.67-1.69z"

/** Google Cloud mark in the four brand colours (regions of one outline path). */
export function GoogleCloudLogo({ className }: { className?: string }) {
  const id = useId()
  const regions = [
    { fill: "#EA4335", x: 0, y: 0, w: 24, h: 11 },
    { fill: "#FBBC05", x: 14.5, y: 11, w: 9.5, h: 13 },
    { fill: "#34A853", x: 0, y: 17.3, w: 14.5, h: 6.7 },
    { fill: "#4285F4", x: 0, y: 11, w: 14.5, h: 6.3 },
  ]
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        {regions.map((r, i) => (
          <clipPath key={i} id={`${id}-${i}`}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} />
          </clipPath>
        ))}
      </defs>
      {regions.map((r, i) => (
        <path key={i} d={PATH} fill={r.fill} clipPath={`url(#${id}-${i})`} />
      ))}
    </svg>
  )
}

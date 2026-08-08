import './marquee-title.css'

/**
 * Wordmark styled like a carnival marquee sign: bold display type
 * flanked by a strip of chasing bulbs. Used on setup + results screens
 * to visually bookend the experience.
 */
export default function MarqueeTitle({ size = 'lg', subtitle }) {
  const bulbCount = size === 'lg' ? 14 : 10
  return (
    <div className={`marquee marquee--${size}`}>
      <div className="marquee__bulbrow" aria-hidden="true">
        {Array.from({ length: bulbCount }).map((_, i) => (
          <span key={i} className="marquee__bulb" style={{ animationDelay: `${i * 0.09}s` }} />
        ))}
      </div>
      <h1 className="marquee__word">
        <span className="marquee__word-drop">DROP</span>
        <span className="marquee__word-zone">ZONE</span>
      </h1>
      {subtitle && <p className="marquee__subtitle">{subtitle}</p>}
      <div className="marquee__bulbrow" aria-hidden="true">
        {Array.from({ length: bulbCount }).map((_, i) => (
          <span key={i} className="marquee__bulb" style={{ animationDelay: `${i * 0.09 + 0.4}s` }} />
        ))}
      </div>
    </div>
  )
}

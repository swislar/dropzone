// Purely decorative — a handful of blurred, slowly-drifting light orbs
// in the same gold/pink/teal marquee palette used throughout the app.
// Keeps setup and results screens feeling like the same cabinet as the
// pinball board, instead of a plain web form bolted onto a game.
export default function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__orb ambient__orb--1" />
      <div className="ambient__orb ambient__orb--2" />
      <div className="ambient__orb ambient__orb--3" />
    </div>
  )
}

// A curated set of high-contrast, evenly-spaced hues that read well as
// small marbles against the dark cabinet background. Cycled with a
// golden-angle offset once a game has more entries than swatches.
export const PALETTE = [
  '#FF3E7F', '#E8B33D', '#34E4C1', '#5B8CFF', '#C05BFF',
  '#FF7A45', '#3DDC97', '#FF5D8F', '#4DD0E1', '#FFC94D',
  '#8C7BFF', '#FF6161', '#57D66C', '#FF9ED2', '#4ADEDE',
]

export function colorForIndex(index) {
  if (index < PALETTE.length) return PALETTE[index]
  // Golden-angle hue rotation keeps overflow colors visually distinct.
  const hue = (index * 137.508) % 360
  return `hsl(${hue.toFixed(0)}, 78%, 60%)`
}

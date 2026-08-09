import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import './color-swatch.css'

export default function ColorSwatch({ color, onChange, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('pointerdown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className="swatch-wrap" ref={ref}>
      <button
        type="button"
        className="swatch-btn"
        style={{ '--c': color }}
        aria-label={`Change color for ${label || 'player'}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div className="swatch-popover" role="dialog" aria-label="Pick a color">
          <HexColorPicker color={color} onChange={onChange} />
          <input
            className="swatch-hex"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            maxLength={7}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  )
}

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HexColorPicker } from 'react-colorful'
import './color-swatch.css'

function getCoords(buttonEl) {
  if (!buttonEl) return null
  const rect = buttonEl.getBoundingClientRect()
  const popoverWidth = 190
  const popoverHeight = 195

  let top = rect.bottom + 6
  if (top + popoverHeight > window.innerHeight - 10 && rect.top - popoverHeight - 6 > 10) {
    top = rect.top - popoverHeight - 6
  }

  let left = rect.left
  if (left + popoverWidth > window.innerWidth - 10) {
    left = Math.max(10, window.innerWidth - popoverWidth - 10)
  }

  return { top, left }
}

export default function ColorSwatch({ color, onChange, label }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)

  function handleToggle() {
    setOpen((prev) => {
      const next = !prev
      if (next && buttonRef.current) {
        setCoords(getCoords(buttonRef.current))
      }
      return next
    })
  }

  useLayoutEffect(() => {
    if (!open) return

    function updatePosition() {
      if (buttonRef.current) {
        setCoords(getCoords(buttonRef.current))
      }
    }

    updatePosition()

    function onDocClick(e) {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    function onScrollOrResize() {
      updatePosition()
    }

    document.addEventListener('pointerdown', onDocClick)
    document.addEventListener('keydown', onEsc)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      document.removeEventListener('pointerdown', onDocClick)
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  return (
    <div className={`swatch-wrap ${open ? 'is-open' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className="swatch-btn"
        style={{ '--c': color }}
        aria-label={`Change color for ${label || 'player'}`}
        aria-expanded={open}
        onClick={handleToggle}
      />
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="swatch-popover"
            role="dialog"
            aria-label="Pick a color"
            style={{
              top: `${coords?.top ?? 0}px`,
              left: `${coords?.left ?? 0}px`,
              visibility: coords ? 'visible' : 'hidden',
            }}
          >
            <HexColorPicker color={color} onChange={onChange} />
            <input
              className="swatch-hex"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              maxLength={7}
              spellCheck={false}
            />
          </div>,
          document.body
        )}
    </div>
  )
}

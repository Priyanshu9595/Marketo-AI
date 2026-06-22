import { useRef, useState } from 'react'

// Wraps content in a card that floats and tilts in 3D toward the cursor, with a
// deepening glow shadow on hover. Purely visual — children render normally.
export default function Tilt3D({ children, max = 9, glow = '#4F46E5', radius = 16, style }) {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false })

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ rx: -py * max, ry: px * max, active: true })
  }
  const reset = () => setTilt({ rx: 0, ry: 0, active: false })

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} style={{ perspective: 1000, ...style }}>
      <div
        style={{
          height: '100%',
          borderRadius: radius,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.active ? 1.015 : 1})`,
          transition: tilt.active
            ? 'transform 0.08s ease-out, box-shadow 0.2s'
            : 'transform 0.45s cubic-bezier(.2,.8,.2,1), box-shadow 0.3s',
          boxShadow: tilt.active
            ? `0 30px 60px -22px ${glow}66, 0 14px 28px -14px rgba(0,0,0,0.28)`
            : '0 14px 34px -20px rgba(0,0,0,0.20)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

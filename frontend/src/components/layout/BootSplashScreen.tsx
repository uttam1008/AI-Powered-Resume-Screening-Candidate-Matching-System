import { useEffect, useRef, useState } from 'react'

interface BootSplashScreenProps {
  onComplete: () => void
}

// Particle data
interface Particle {
  x: number; y: number; vx: number; vy: number
  radius: number; alpha: number; color: string
}

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#3b82f6', '#a78bfa']
const TOTAL_MS = 5000

export default function BootSplashScreen({ onComplete }: BootSplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'enter' | 'run' | 'exit'>('enter')
  const [titleVisible, setTitleVisible] = useState(false)
  const [subtitleVisible, setSubtitleVisible] = useState(false)
  const [badgesVisible, setBadgesVisible] = useState(false)

  // Canvas particle animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let animId: number
    const particles: Particle[] = []
    const nodes: { x: number; y: number; pulse: number; phase: number }[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // Rebuild nodes on resize
      nodes.length = 0
      const cols = 7, rows = 5
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          nodes.push({
            x: (canvas.width / (cols + 1)) * (c + 1),
            y: (canvas.height / (rows + 1)) * (r + 1),
            pulse: 0,
            phase: Math.random() * Math.PI * 2,
          })
        }
      }
    }
    resize()
    window.addEventListener('resize', resize)

    // Spawn particles
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
    }

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.012

      // Draw neural-net lines between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 260) {
            const alpha = (1 - dist / 260) * 0.18
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(99,102,241,${alpha})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        n.phase += 0.018
        const glow = Math.sin(n.phase) * 0.5 + 0.5
        const r = 3 + glow * 3
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4)
        grad.addColorStop(0, `rgba(139,92,246,${0.6 + glow * 0.4})`)
        grad.addColorStop(1, 'rgba(139,92,246,0)')
        ctx.beginPath()
        ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.x, n.y, r * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(199,210,254,${0.7 + glow * 0.3})`
        ctx.fill()
      })

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // Progress & phase sequencing — total 5 seconds
  useEffect(() => {
    // Staggered text entrances
    const t1 = setTimeout(() => setTitleVisible(true), 400)
    const t2 = setTimeout(() => setSubtitleVisible(true), 900)
    const t3 = setTimeout(() => setBadgesVisible(true), 1400)
    setPhase('run')

    // Smooth progress bar over 5s
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const elapsed = now - start
      const pct = Math.min(elapsed / TOTAL_MS, 1)
      setProgress(pct)
      if (pct < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        // Exit
        setPhase('exit')
        setTimeout(onComplete, 600)
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      cancelAnimationFrame(raf)
    }
  }, [onComplete])

  const labels = ['RAG Pipeline', 'pgvector Search', 'Gemini AI', 'Neural Matching']

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 30% 40%, #0f0a2e 0%, #0a0a14 50%, #000007 100%)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.6s ease-in-out' : 'opacity 0.4s ease-out',
      }}
    >
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Ambient glow blobs */}
      <div className="absolute top-[15%] left-[10%] w-[50vw] h-[50vh] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute bottom-[10%] right-[10%] w-[40vw] h-[40vh] rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(100px)' }} />

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl w-full">

        {/* Animated ring logo */}
        <div className="relative mb-8" style={{ width: 120, height: 120 }}>
          {/* Rotating outer ring */}
          <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 4s linear infinite' }} viewBox="0 0 120 120">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="54" fill="none" stroke="url(#ringGrad)" strokeWidth="2.5"
              strokeDasharray="200 140" strokeLinecap="round" />
          </svg>
          {/* Counter-rotating inner ring */}
          <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 3s linear infinite reverse', margin: 12 }} viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#a78bfa" strokeWidth="1.5"
              strokeDasharray="80 180" strokeLinecap="round" opacity="0.5" />
          </svg>
          {/* Center shield icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 16, padding: 16,
              boxShadow: '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(99,102,241,0.2)'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z"
                  fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" />
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div style={{
          transform: titleVisible ? 'translateY(0)' : 'translateY(30px)',
          opacity: titleVisible ? 1 : 0,
          transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #a78bfa 70%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 4,
          }}>
            AI Resume Screener
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{
          transform: subtitleVisible ? 'translateY(0)' : 'translateY(20px)',
          opacity: subtitleVisible ? 1 : 0,
          transition: 'all 0.6s ease',
          marginBottom: 28,
        }}>
          <p style={{ color: '#94a3b8', fontSize: '1rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 }}>
            Powered by Gemini AI · pgvector RAG · Real-Time Insights
          </p>
        </div>

        {/* Feature Badges */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10,
          opacity: badgesVisible ? 1 : 0,
          transform: badgesVisible ? 'scale(1)' : 'scale(0.9)',
          transition: 'all 0.5s ease',
          marginBottom: 48,
        }}>
          {labels.map((label, i) => (
            <span key={label} style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: 99, padding: '5px 14px',
              fontSize: 12, fontWeight: 600,
              color: '#a5b4fc',
              letterSpacing: '0.05em',
              backdropFilter: 'blur(8px)',
              animation: `fadeInUp 0.4s ease ${i * 0.08}s both`,
            }}>
              {label}
            </span>
          ))}
        </div>

        {/* Progress Section */}
        <div style={{ width: '100%', maxWidth: 480 }}>
          {/* Bar */}
          <div style={{
            height: 3, background: 'rgba(255,255,255,0.08)',
            borderRadius: 99, overflow: 'hidden', marginBottom: 14,
          }}>
            <div style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
              borderRadius: 99,
              boxShadow: '0 0 12px rgba(99,102,241,0.8)',
              transition: 'width 0.1s linear',
            }} />
          </div>
          {/* Label */}
          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {progress < 0.25 ? 'Initializing AI Engine...'
              : progress < 0.5 ? 'Loading Vector Search...'
              : progress < 0.75 ? 'Connecting Gemini Models...'
              : progress < 0.99 ? 'Launching Interface...'
              : 'Ready ✓'}
          </p>
        </div>
      </div>

      {/* CSS for spin + fadeInUp */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}

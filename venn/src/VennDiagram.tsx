import React, { useRef } from "react"
import { motion, useScroll, useTransform, useSpring } from "motion/react"

/* ── animation variants ─────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.15,
    },
  },
}

const circleVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 16,
      mass: 1.1,
    },
  },
}

const labelVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.45, ease: "easeOut" },
  }),
}

const tagVariants = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: (delay: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay, duration: 0.3, ease: "easeOut" },
  }),
}

const lineVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { delay: 1.8, duration: 0.7, ease: "easeInOut" },
  },
}

const hatchVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { delay: 1.4, duration: 0.6, ease: "easeOut" },
  },
}

const dotVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { delay: 2.45, type: "spring", stiffness: 200, damping: 12 },
  },
}

/* ── CSS keyframe float ──────────────────────────────────────────── */

const floatKeyframes = `
@keyframes float0 {
  0%, 100% { transform: translate(0px, 0px); }
  25% { transform: translate(2px, -3px); }
  50% { transform: translate(-1.5px, 1.5px); }
  75% { transform: translate(1px, -2px); }
}
@keyframes float1 {
  0%, 100% { transform: translate(0px, 0px); }
  25% { transform: translate(-2.5px, -2px); }
  50% { transform: translate(1px, 2.5px); }
  75% { transform: translate(-1px, -1.5px); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0px, 0px); }
  25% { transform: translate(1.5px, -2.5px); }
  50% { transform: translate(-2px, 1px); }
  75% { transform: translate(2.5px, -1px); }
}
@keyframes float3 {
  0%, 100% { transform: translate(0px, 0px); }
  25% { transform: translate(-1px, -3px); }
  50% { transform: translate(2px, 2px); }
  75% { transform: translate(-2px, -1px); }
}
`

/* inject keyframes once */
if (typeof document !== "undefined") {
  const id = "venn-float-keyframes"
  if (!document.getElementById(id)) {
    const style = document.createElement("style")
    style.id = id
    style.textContent = floatKeyframes
    document.head.appendChild(style)
  }
}

/* ── floating badge tag ─────────────────────────────────────────── */

function Tag({
  text,
  x,
  y,
  delay,
  bg,
  fg,
  floatSeed,
}: {
  key?: React.Key
  text: string
  x: number
  y: number
  delay: number
  bg: string
  fg: string
  floatSeed: number
}) {
  const charWidth = 8
  const padX = 14
  const pillW = text.length * charWidth + padX * 2
  const pillH = 28

  const floatClass = floatSeed % 4
  const duration = 2.8 + (floatSeed % 5) * 0.4

  return (
    <motion.g
      custom={delay}
      variants={tagVariants}
      style={{
        animation: `float${floatClass} ${duration}s ease-in-out ${floatSeed * 0.15}s infinite`,
      }}
    >
      <rect
        x={x - pillW / 2}
        y={y - pillH / 2}
        rx={7}
        width={pillW}
        height={pillH}
        fill={bg}
      />
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={fg}
        fontSize={14}
        fontWeight={600}
        letterSpacing={0.3}
        style={{ fontFamily: "'Inter', sans-serif", pointerEvents: "none" }}
      >
        {text}
      </text>
    </motion.g>
  )
}

/* ── main dimensions (used for viewBox) ─────────────────────────── */

const VB_W = 1000
const VB_H = 900

/* ── component ──────────────────────────────────────────────────── */

export function VennDiagram() {
  /* Equilateral triangle layout for consistent intersection sizes */
  const r = 230
  const side = 340  /* center-to-center distance — controls overlap */
  const cx1 = VB_W / 2 - side / 2   /* 330 */
  const cy1 = VB_H * 0.28           /* 252 */
  const cx2 = VB_W / 2 + side / 2   /* 670 */
  const cy2 = cy1
  const cx3 = VB_W / 2              /* 500 */
  const cy3 = cy1 + side * 0.866    /* 252 + 294 ≈ 546 */

  const centerX = (cx1 + cx2 + cx3) / 3
  const centerY = (cy1 + cy2 + cy3) / 3
  const calloutEndX = VB_W * 0.88
  const calloutEndY = VB_H * 0.56

  const headingFont = "'Satoshi', sans-serif"

  const userTagBg = "#E879F9"  /* fuchsia — matches circle 1 */
  const techTagBg = "#818CF8"  /* indigo — matches circle 2 */
  const bizTagBg  = "#F97316"  /* orange — matches circle 3 */

  /* scroll-based bounce — Framer-compatible (uses element in viewport) */
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })
  const bounceY = useTransform(
    scrollYProgress,
    [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1],
    [0, -6, 3, -2, 4, -4, 0]
  )
  const bounceYSpring = useSpring(bounceY, { stiffness: 100, damping: 20 })

  /* All tags positioned INSIDE their circle */
  const userTags = [
    { text: "Empathy",      x: cx1 - 80,  y: cy1 - 100 },
    { text: "Overthinking",  x: cx1 - 10,  y: cy1 - 140 },
    { text: "Pain",          x: cx1 - 130, y: cy1 - 30 },
    { text: "Why?",          x: cx1 - 50,  y: cy1 - 55 },
    { text: "Motivation",    x: cx1 - 120, y: cy1 + 50 },
    { text: "Frustration",   x: cx1 - 70,  y: cy1 + 120 },
  ]

  const techTags = [
    { text: "Cursor",       x: cx2 + 80,  y: cy2 - 100 },
    { text: "V0",           x: cx2 + 10,  y: cy2 - 140 },
    { text: "Figma Make",   x: cx2 + 130, y: cy2 - 30 },
    { text: "Kimi",         x: cx2 + 50,  y: cy2 - 55 },
    { text: "HTML/CSS",     x: cx2 + 120, y: cy2 + 50 },
    { text: "CS Engineer",  x: cx2 + 70,  y: cy2 + 120 },
  ]

  const bizTags = [
    { text: "PMF",            x: cx3 - 140, y: cy3 + 55 },
    { text: "Adoption",       x: cx3 + 140, y: cy3 + 50 },
    { text: "Roadmap",        x: cx3 - 105, y: cy3 + 125 },
    { text: "Go-to-Market",   x: cx3 + 30,  y: cy3 + 90 },
    { text: "0 → 1",          x: cx3 - 55,  y: cy3 + 160 },
    { text: "Discovery",      x: cx3 + 120, y: cy3 + 130 },
  ]

  return (
    <motion.div
      ref={containerRef}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{
        width: "100%",
        aspectRatio: `${VB_W} / ${VB_H}`,
        y: bounceYSpring,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* ── User: hot pink → fuchsia → violet ─────────────── */}
          <linearGradient id="strokeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="40%" stopColor="#E879F9" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          {/* ── Tech: cyan → electric blue → purple ──────────── */}
          <linearGradient id="strokeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
          {/* ── Business: amber → orange → rose ──────────────── */}
          <linearGradient id="strokeGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>
        </defs>

        {/* ── circles — vibrant gradient stroke, no fill ─────── */}
        <motion.g variants={circleVariants}>
          <circle cx={cx1} cy={cy1} r={r} fill="none" stroke="url(#strokeGrad1)" strokeWidth={2.5} />
        </motion.g>

        <motion.g variants={circleVariants}>
          <circle cx={cx2} cy={cy2} r={r} fill="none" stroke="url(#strokeGrad2)" strokeWidth={2.5} />
        </motion.g>

        <motion.g variants={circleVariants}>
          <circle cx={cx3} cy={cy3} r={r} fill="none" stroke="url(#strokeGrad3)" strokeWidth={2.5} />
        </motion.g>

        {/* ── circle heading labels — centered ───────────────── */}

        <motion.text
          x={cx1} y={cy1}
          textAnchor="middle" dominantBaseline="middle"
          fill="#1a1a2e" fontWeight={700} fontSize={36}
          custom={0.95} variants={labelVariants}
          style={{ pointerEvents: "none", fontFamily: headingFont }}
        >
          User
        </motion.text>

        <motion.text
          x={cx2} y={cy2}
          textAnchor="middle" dominantBaseline="middle"
          fill="#1a1a2e" fontWeight={700} fontSize={32}
          custom={1.0} variants={labelVariants}
          style={{ pointerEvents: "none", fontFamily: headingFont }}
        >
          Technology
        </motion.text>

        <motion.text
          x={cx3} y={cy3}
          textAnchor="middle" dominantBaseline="middle"
          fill="#1a1a2e" fontWeight={700} fontSize={36}
          custom={1.05} variants={labelVariants}
          style={{ pointerEvents: "none", fontFamily: headingFont }}
        >
          Business
        </motion.text>

        {/* ── scattered floating skill tags ───────────────────── */}

        {userTags.map((t, i) => (
          <Tag key={t.text} text={t.text} x={t.x} y={t.y}
            delay={1.15 + i * 0.07} bg={userTagBg} fg="#fff" floatSeed={i} />
        ))}

        {techTags.map((t, i) => (
          <Tag key={t.text} text={t.text} x={t.x} y={t.y}
            delay={1.25 + i * 0.07} bg={techTagBg} fg="#fff" floatSeed={i + 8} />
        ))}

        {bizTags.map((t, i) => (
          <Tag key={t.text} text={t.text} x={t.x} y={t.y}
            delay={1.35 + i * 0.07} bg={bizTagBg} fg="#fff" floatSeed={i + 16} />
        ))}

        {/* ── "I'm here" doodled arrow callout ──────────────── */}

        {/* wobbly hand-drawn curve */}
        <motion.path
          d={`M ${centerX + 8} ${centerY + 8}
              C ${centerX + 40} ${centerY + 35},
                ${centerX + 80} ${centerY + 60},
                ${calloutEndX - 80} ${calloutEndY - 15}
              C ${calloutEndX - 50} ${calloutEndY - 8},
                ${calloutEndX - 25} ${calloutEndY - 2},
                ${calloutEndX - 5} ${calloutEndY + 2}`}
          fill="none" stroke="#1a1a2e" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          variants={lineVariants}
        />
        {/* arrowhead — two short strokes */}
        <motion.path
          d={`M ${calloutEndX - 5} ${calloutEndY + 2}
              L ${calloutEndX - 18} ${calloutEndY - 10}`}
          fill="none" stroke="#1a1a2e" strokeWidth={2}
          strokeLinecap="round"
          variants={lineVariants}
        />
        <motion.path
          d={`M ${calloutEndX - 5} ${calloutEndY + 2}
              L ${calloutEndX - 20} ${calloutEndY + 8}`}
          fill="none" stroke="#1a1a2e" strokeWidth={2}
          strokeLinecap="round"
          variants={lineVariants}
        />

        {/* dot at start */}
        <motion.circle
          cx={centerX + 5} cy={centerY + 5} r={4}
          fill="#1a1a2e" variants={dotVariants}
        />

        <motion.text
          x={calloutEndX + 6} y={calloutEndY + 2}
          textAnchor="start" dominantBaseline="middle"
          fill="#1a1a2e" fontWeight={700} fontSize={20}
          fontStyle="italic" custom={2.5} variants={labelVariants}
          style={{ pointerEvents: "none", fontFamily: headingFont }}
        >
          I'm here
        </motion.text>

        {/* ── crafted-by note ─────────────────────────────────── */}
        <motion.text
          x={VB_W / 2} y={VB_H - 12}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(120,100,80,0.5)" fontSize={18}
          letterSpacing={1.5}
          custom={3.0} variants={labelVariants}
          style={{ pointerEvents: "none", fontFamily: "'Inter', sans-serif" }}
        >
          crafted by a human + cursor
        </motion.text>
      </svg>
    </motion.div>
  )
}

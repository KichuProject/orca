import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Music, Waves, Eye } from 'lucide-react'

/**
 * Orca3DMascot
 * High-fidelity 3D Animated Dolphin Mascot powered by Three.js & Framer Motion.
 *
 * Features:
 * 1. 3D Swimming: Lifelike spine wave undulation, articulated tail fluke kicking,
 *    and rhythmic pectoral flipper paddling with buoyant heave.
 * 2. 3D Dancing: Multiple acrobatic tricks on click / hover (360° Backflip,
 *    360° Barrel Roll, 720° Pirouette Dance, and Cheerful Tail Wiggle).
 * 3. 3D Cursor Watching: Smooth real-time 3D look-at and banking towards user's cursor across screen.
 * 4. 3D Underwater Lighting & Caustics: Multi-point directional and bioluminescent core lighting.
 * 5. 3D Bubble Trail & Spirals: Particle system emitting bubbles on swim and dance.
 * 6. Framer Motion Integration: Floating levitation, spring physics, and animated trick badges.
 */
export default function Orca3DMascot({
  size = 100,
  isSpeaking = false,
  isListening = false,
  onClick,
  className = '',
  showAura = true,
  interactive = true,
  enableDanceOnClick = true,
}) {
  const mountRef = useRef(null)
  const animFrameRef = useRef(null)
  const [currentDanceMove, setCurrentDanceMove] = useState(null)
  const [danceBadge, setDanceBadge] = useState('')
  const [isHovered, setIsHovered] = useState(false)

  // Internal 3D state refs (for 60fps render loop without re-triggering React renders)
  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, distance: 999 })
  const animStateRef = useRef({
    mode: 'swim', // 'swim' | 'dance_flip' | 'dance_roll' | 'dance_pirouette' | 'dance_wiggle'
    danceProgress: 0,
    time: Math.random() * 100,
    trickIndex: 0,
  })

  // List of dance moves to cycle through on click
  const DANCE_MOVES = useMemo(() => [
    { id: 'dance_flip', name: '🐬 360° Backflip Leap!', duration: 1.6 },
    { id: 'dance_roll', name: '🌀 360° Barrel Roll!', duration: 1.4 },
    { id: 'dance_pirouette', name: '💃 Dolphin Pirouette!', duration: 1.8 },
    { id: 'dance_wiggle', name: '🌊 Joyful Tail Splash!', duration: 1.3 },
  ], [])

  // Trigger a dance trick
  const triggerDance = useCallback((moveId = null) => {
    if (!interactive && !enableDanceOnClick) return

    const selected = moveId
      ? DANCE_MOVES.find(m => m.id === moveId) || DANCE_MOVES[0]
      : DANCE_MOVES[animStateRef.current.trickIndex % DANCE_MOVES.length]

    animStateRef.current.trickIndex += 1
    animStateRef.current.mode = selected.id
    animStateRef.current.danceProgress = 0
    setCurrentDanceMove(selected.id)
    setDanceBadge(selected.name)

    // Clear badge after trick completes
    setTimeout(() => {
      setDanceBadge('')
      setCurrentDanceMove(null)
    }, selected.duration * 1000 + 400)
  }, [interactive, enableDanceOnClick, DANCE_MOVES])

  // Mouse move listener for 3D cursor watching
  useEffect(() => {
    if (!interactive) return

    const handleMouseMove = (e) => {
      if (!mountRef.current) return
      const rect = mountRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const dist = Math.hypot(dx, dy)

      // Normalized target angles (-1 to +1)
      const nx = Math.max(-1, Math.min(1, dx / (window.innerWidth * 0.45)))
      const ny = Math.max(-1, Math.min(1, dy / (window.innerHeight * 0.45)))

      mousePosRef.current.targetX = nx
      mousePosRef.current.targetY = ny
      mousePosRef.current.distance = dist
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [interactive])

  // Three.js 3D Scene Setup
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = size
    const height = size

    // 1. Scene & Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.set(0, 0, 4.2)

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    // NoToneMapping ensures the texture colours render exactly as they appear in the source image
    renderer.toneMapping = THREE.NoToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)

    // 3. Underwater Oceanic Lighting
    // Bright neutral ambient so the mascot texture shows its original vivid colours
    const ambientLight = new THREE.AmbientLight(0xffffff, 3.2)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8)
    sunLight.position.set(2, 4, 5)
    scene.add(sunLight)

    const fillLight = new THREE.PointLight(0x7dd3fc, 1.2, 15)
    fillLight.position.set(-3, -1, 3)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0x06b6d4, 0.8, 10)
    rimLight.position.set(0, -2, -1)
    scene.add(rimLight)

    // 4. Main Articulated Dolphin Hierarchy
    const dolphinRoot = new THREE.Group()
    scene.add(dolphinRoot)

    const bodyGroup = new THREE.Group()
    dolphinRoot.add(bodyGroup)

    // Articulated Tail Stem & Fluke
    const tailStem = new THREE.Group()
    tailStem.position.set(-0.65, -0.3, 0)
    bodyGroup.add(tailStem)

    const tailFluke = new THREE.Group()
    tailFluke.position.set(-0.55, -0.15, 0)
    tailStem.add(tailFluke)

    // Articulated Flippers
    const leftFlipper = new THREE.Group()
    leftFlipper.position.set(0.2, -0.35, 0.25)
    bodyGroup.add(leftFlipper)

    const rightFlipper = new THREE.Group()
    rightFlipper.position.set(0.2, -0.35, -0.25)
    bodyGroup.add(rightFlipper)

    // Bioluminescent AI Core Light
    const coreLight = new THREE.PointLight(0x06b6d4, 3.2, 3.5)
    coreLight.position.set(0.05, -0.05, 0.1)
    bodyGroup.add(coreLight)

    // 5. Build 3D Materials and Geometry
    // Load high-res texture from existing /assets/orca-mascot-3d.png
    const textureLoader = new THREE.TextureLoader()
    let dolphinMesh = null
    let coreOrbMesh = null

    // Glowing Bioluminescent Core Sphere
    const coreOrbGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const coreOrbMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.92,
    })
    coreOrbMesh = new THREE.Mesh(coreOrbGeo, coreOrbMat)
    coreOrbMesh.position.copy(coreLight.position)
    bodyGroup.add(coreOrbMesh)

    // Load texture
    textureLoader.load(
      '/assets/orca-mascot-3d.png',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.generateMipmaps = true
        texture.minFilter = THREE.LinearMipmapLinearFilter

        // Slightly bigger plane so the mascot appears larger
        const planeGeo = new THREE.PlaneGeometry(2.5, 2.5, 8, 8)
        
        // Gentle curvature to give 3D volume
        const pos = planeGeo.attributes.position
        for (let i = 0; i < pos.count; i++) {
          const vx = pos.getX(i)
          const vy = pos.getY(i)
          const distFromCenter = Math.hypot(vx, vy)
          pos.setZ(i, Math.cos(distFromCenter * 1.5) * 0.10)
        }
        planeGeo.computeVertexNormals()

        // Use MeshBasicMaterial so the texture renders at full brightness
        // unaffected by scene lighting — preserves the mascot's original vivid colours
        const planeMat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.05,
          side: THREE.DoubleSide,
        })

        dolphinMesh = new THREE.Mesh(planeGeo, planeMat)
        dolphinMesh.castShadow = true
        bodyGroup.add(dolphinMesh)
      },
      undefined,
      (err) => {
        console.debug('3D texture fallback to procedural silhouette:', err)
        // Procedural fallback if image load is delayed
        const fallbackGeo = new THREE.ConeGeometry(0.7, 1.8, 16)
        fallbackGeo.rotateZ(Math.PI / 2)
        const fallbackMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          roughness: 0.3,
          metalness: 0.2,
        })
        dolphinMesh = new THREE.Mesh(fallbackGeo, fallbackMat)
        bodyGroup.add(dolphinMesh)
      }
    )

    // 6. 3D Particle Bubbles System
    const bubbleCount = 20
    const bubbleGeo = new THREE.SphereGeometry(0.04, 8, 8)
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.65,
    })

    const bubbles = []
    for (let b = 0; b < bubbleCount; b++) {
      const mesh = new THREE.Mesh(bubbleGeo, bubbleMat.clone())
      mesh.position.set(
        (Math.random() - 0.5) * 1.5,
        -1.5 - Math.random() * 2,
        (Math.random() - 0.5) * 1.0
      )
      mesh.scale.setScalar(0.4 + Math.random() * 0.9)
      scene.add(mesh)
      bubbles.push({
        mesh,
        vy: 0.015 + Math.random() * 0.025,
        vx: (Math.random() - 0.5) * 0.008,
        life: Math.random(),
      })
    }

    // 7. Render Loop with High-Performance 60fps Physics & Animations
    let prevTime = performance.now()

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      const now = performance.now()
      const delta = Math.min((now - prevTime) / 1000, 0.1)
      prevTime = now

      const st = animStateRef.current
      st.time += delta

      // Smooth cursor mouse tracking dampening
      mousePosRef.current.x += (mousePosRef.current.targetX - mousePosRef.current.x) * 0.08
      mousePosRef.current.y += (mousePosRef.current.targetY - mousePosRef.current.y) * 0.08

      const mx = mousePosRef.current.x
      const my = mousePosRef.current.y
      const isNear = mousePosRef.current.distance < 180

      // Core light pulsing
      if (coreLight && coreOrbMesh) {
        const pulse = isSpeaking
          ? 2.8 + Math.sin(st.time * 16) * 1.8 // Fast energetic pulse when speaking
          : isListening
          ? 2.2 + Math.sin(st.time * 8) * 0.8  // Steady breathing glow when listening
          : 1.8 + Math.sin(st.time * 3.5) * 0.5 // Calm underwater glow
        coreLight.intensity = pulse
        coreOrbMesh.scale.setScalar(0.9 + pulse * 0.12)
      }

      // ── ANIMATION MODE CONTROLLER ─────────────────────────────────────
      if (st.mode === 'swim') {
        // Natural 3D Swimming Physics
        const swimSpeed = isSpeaking ? 6.5 : isHovered ? 5.2 : 3.8

        // Spine & Tail undulation
        tailStem.rotation.y = Math.sin(st.time * swimSpeed) * 0.32
        tailFluke.rotation.y = Math.sin(st.time * swimSpeed - 1.0) * 0.55
        tailFluke.rotation.z = Math.cos(st.time * swimSpeed) * 0.15

        // Flipper paddling
        leftFlipper.rotation.z = 0.2 + Math.sin(st.time * 3.2) * 0.2
        rightFlipper.rotation.z = -0.2 - Math.sin(st.time * 3.2) * 0.2
        leftFlipper.rotation.x = Math.sin(st.time * swimSpeed) * 0.15

        // Buoyant vertical heave & roll bank
        dolphinRoot.position.y = Math.sin(st.time * 2.2) * 0.12
        dolphinRoot.position.x = Math.cos(st.time * 1.4) * 0.06

        // 3D Cursor Watching: Orient body toward cursor
        const targetRotY = mx * 0.65 // Yaw left-right
        const targetRotX = -my * 0.45 // Pitch up-down
        const targetRotZ = mx * -0.25 // Banking roll into turn

        dolphinRoot.rotation.y += (targetRotY - dolphinRoot.rotation.y) * 0.08
        dolphinRoot.rotation.x += (targetRotX - dolphinRoot.rotation.x) * 0.08
        dolphinRoot.rotation.z += (targetRotZ - dolphinRoot.rotation.z) * 0.08

        // If cursor is close, dolphin leans forward curious
        if (isNear && interactive) {
          dolphinRoot.position.z += (0.28 - dolphinRoot.position.z) * 0.08
        } else {
          dolphinRoot.position.z += (0 - dolphinRoot.position.z) * 0.08
        }

      } else if (st.mode === 'dance_flip') {
        // 360° Backflip Leap
        st.danceProgress += delta * 1.4
        const p = Math.min(1, st.danceProgress)
        const angle = p * Math.PI * 2

        dolphinRoot.rotation.x = -angle
        dolphinRoot.position.y = Math.sin(p * Math.PI) * 0.85 // High arching leap
        dolphinRoot.position.z = Math.sin(p * Math.PI) * 0.35

        // Tail whip during flip
        tailStem.rotation.y = Math.sin(p * 12) * 0.4
        tailFluke.rotation.y = Math.sin(p * 14) * 0.7

        if (p >= 1) {
          st.mode = 'swim'
          dolphinRoot.rotation.x = 0
          dolphinRoot.position.set(0, 0, 0)
        }

      } else if (st.mode === 'dance_roll') {
        // 360° Barrel Roll
        st.danceProgress += delta * 1.6
        const p = Math.min(1, st.danceProgress)
        const angle = p * Math.PI * 2

        dolphinRoot.rotation.z = angle
        dolphinRoot.position.y = Math.sin(p * Math.PI) * 0.35
        dolphinRoot.rotation.y = Math.sin(p * Math.PI) * 0.4

        // Active flippers while rolling
        leftFlipper.rotation.z = Math.sin(p * 16) * 0.4
        rightFlipper.rotation.z = -Math.sin(p * 16) * 0.4

        if (p >= 1) {
          st.mode = 'swim'
          dolphinRoot.rotation.z = 0
          dolphinRoot.position.set(0, 0, 0)
        }

      } else if (st.mode === 'dance_pirouette') {
        // Standing Pirouette Spin
        st.danceProgress += delta * 1.2
        const p = Math.min(1, st.danceProgress)
        const angle = p * Math.PI * 4 // Double 720° spin

        dolphinRoot.rotation.y = angle
        dolphinRoot.rotation.z = 0.3 // Standing upright
        dolphinRoot.position.y = Math.sin(p * Math.PI) * 0.45

        leftFlipper.rotation.x = Math.sin(st.time * 20) * 0.45
        rightFlipper.rotation.x = -Math.sin(st.time * 20) * 0.45

        if (p >= 1) {
          st.mode = 'swim'
          dolphinRoot.rotation.set(0, 0, 0)
          dolphinRoot.position.set(0, 0, 0)
        }

      } else if (st.mode === 'dance_wiggle') {
        // Joyful Tail Wiggle & Bounce
        st.danceProgress += delta * 1.5
        const p = Math.min(1, st.danceProgress)

        tailStem.rotation.y = Math.sin(p * 24) * 0.7
        tailFluke.rotation.y = Math.sin(p * 26) * 0.95
        dolphinRoot.position.y = Math.sin(p * 14) * 0.25
        dolphinRoot.rotation.z = Math.sin(p * 16) * 0.2

        if (p >= 1) {
          st.mode = 'swim'
          dolphinRoot.position.set(0, 0, 0)
        }
      }

      // Update 3D Bubble particles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]
        b.mesh.position.y += b.vy
        b.mesh.position.x += b.vx + Math.sin(st.time * 2 + i) * 0.003
        b.life += delta * 0.6

        if (b.mesh.position.y > 2.2 || b.life > 1) {
          b.mesh.position.set(
            dolphinRoot.position.x - 0.6 + (Math.random() - 0.5) * 0.4,
            dolphinRoot.position.y - 0.4 + (Math.random() - 0.5) * 0.3,
            dolphinRoot.position.z + (Math.random() - 0.5) * 0.4
          )
          b.life = 0
        }
        b.mesh.material.opacity = Math.max(0, (1 - b.life) * 0.65)
      }

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup on unmount
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
      coreOrbGeo.dispose()
      coreOrbMat.dispose()
      bubbleGeo.dispose()
      bubbleMat.dispose()
      scene.clear()
    }
  }, [size, isSpeaking, isListening, interactive, isHovered])

  // Handle mascot click
  const handleClick = (e) => {
    if (enableDanceOnClick) {
      triggerDance()
    }
    if (onClick) onClick(e)
  }

  return (
    <motion.div
      whileHover={interactive ? { scale: 1.07 } : {}}
      whileTap={interactive ? { scale: 0.93 } : {}}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative select-none ${interactive ? 'cursor-pointer group' : ''} ${className}`}
      style={{
        width: size,
        height: size,
      }}
      title={interactive ? "Click to see 3D dolphin dance & backflip!" : "ORCA 3D Mascot"}
    >
      {/* ── 1. Bioluminescent Oceanic Glow & Sonar Rings ──────────── */}
      {showAura && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full transition-all duration-500 blur-md pointer-events-none ${
              isSpeaking
                ? 'bg-cyan-400/50 scale-115 opacity-100'
                : isListening
                ? 'bg-emerald-400/45 scale-110 opacity-90'
                : isHovered
                ? 'bg-sky-400/35 scale-105 opacity-80'
                : 'bg-oceanBlue/20 scale-95 opacity-50'
            }`}
          />

          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-cyan-300/90 shadow-[0_0_14px_#22d3ee] animate-sonar-1" />
              <div className="absolute inset-0 rounded-full border-2 border-sky-400/80 shadow-[0_0_16px_#38bdf8] animate-sonar-2" />
            </>
          )}

          {isListening && (
            <div className="absolute -inset-1 rounded-full border-2 border-emerald-400/80 animate-ping opacity-75" />
          )}
        </div>
      )}

      {/* ── 2. Three.js 3D WebGL Canvas Mount ─────────────────────── */}
      <div
        ref={mountRef}
        className="w-full h-full relative z-10 flex items-center justify-center pointer-events-none"
        style={{ width: size, height: size }}
      />

      {/* ── 3. Interactive Dance Move Floating Badge ───────────────── */}
      <AnimatePresence>
        {danceBadge && size >= 48 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -size * 0.45, scale: 1 }}
            exit={{ opacity: 0, y: -size * 0.65, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-full bg-navy/95 text-cyan-300 text-[11px] font-black border border-cyan-400/50 shadow-xl backdrop-blur-md flex items-center gap-1.5"
          >
            <Sparkles size={11} className="text-cyan-400 animate-spin" />
            <span>{danceBadge}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

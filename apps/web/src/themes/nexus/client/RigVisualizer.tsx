'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import { RotateCcw, Sparkles } from 'lucide-react'
import { playMountSound, playSparkleSound, playTickSound } from '../lib/audio'

/**
 * Entry 71 (Nexus) — three.js rig visualizer ported from `shop layout/
 * src/components/BuildCoresVisualizer.tsx`. Loaded ONLY through
 * `client/NexusRigLazy.tsx` (next/dynamic ssr:false) so the three chunk
 * never ships in the entry bundle.
 *
 * Port notes vs the source:
 * - `0x` numeric materials pass the raw-hex lint (only `#[0-9a-f]{3,8}`
 *   string literals are banned); canvas texture fillStyles were rewritten
 *   to rgb()/rgba() equivalents for the same reason.
 * - Theme-dot swatches derive their CSS color via `THREE.Color.getStyle()`
 *   (rgb() string) so the number literal stays the single source of truth.
 * - `onSelectComponentCategory` became `categoryLinks` + `router.push` —
 *   extracting a part navigates to that category's /shop/[slug] (plan §26).
 * - Ambient fan spin + RGB breathing pause under prefers-reduced-motion;
 *   user-driven orbit/extract animations stay (they are purposeful motion).
 */

export type ComponentPartId = 'gpu' | 'cpu' | 'cooling' | 'ram'

export type RigCategoryLinks = Partial<Record<ComponentPartId, string>>

const THEMES = [
  { id: 'cyan', name: 'Cyber Cyan', primary: 0x00eefc, secondary: 0x0070f3 },
  { id: 'violet', name: 'Aurora Violet', primary: 0xc084fc, secondary: 0x7c3aed },
  { id: 'crimson', name: 'ROG Crimson', primary: 0xef4444, secondary: 0x991b1b },
  { id: 'emerald', name: 'Matrix Emerald', primary: 0x10b981, secondary: 0x047857 },
  { id: 'white', name: 'Stealth White', primary: 0xf8fafc, secondary: 0x64748b },
] as const

// High-resolution procedural PCB texture with copper traces & microchips
function createMasterPcbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!

  // Deep matte obsidian motherboard base
  ctx.fillStyle = 'rgb(17,23,35)'
  ctx.fillRect(0, 0, 1024, 1024)

  // Micro circuit trace lines (Gold bus)
  ctx.strokeStyle = 'rgba(234,179,8,0.4)'
  ctx.lineWidth = 1.4
  for (let i = 0; i < 110; i++) {
    ctx.beginPath()
    const startX = Math.random() * 1024
    const startY = Math.random() * 1024
    ctx.moveTo(startX, startY)
    const midX = startX + (Math.random() - 0.5) * 140
    const midY = startY + (Math.random() - 0.5) * 140
    ctx.lineTo(midX, midY)
    ctx.lineTo(midX + (Math.random() > 0.5 ? 90 : -90), midY)
    ctx.stroke()
  }

  // Cyan bus traces
  ctx.strokeStyle = 'rgba(0,238,252,0.25)'
  ctx.lineWidth = 1.2
  for (let j = 0; j < 60; j++) {
    ctx.beginPath()
    const sx = 550 + Math.random() * 400
    const sy = 120 + Math.random() * 450
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx, sy + 70)
    ctx.stroke()
  }

  // Micro Surface Mount ICs
  ctx.fillStyle = 'rgb(8,11,18)'
  ctx.strokeStyle = 'rgb(51,65,85)'
  ctx.lineWidth = 1
  for (let c = 0; c < 42; c++) {
    const cx = 70 + (c % 7) * 135
    const cy = 70 + Math.floor(c / 7) * 145
    ctx.fillRect(cx, cy, 38, 38)
    ctx.strokeRect(cx, cy, 38, 38)
  }

  // Gold solder contact dots
  ctx.fillStyle = 'rgb(250,204,21)'
  for (let d = 0; d < 260; d++) {
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 3, 3)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

// GPU Backplate Texture with Brushed Metal & Laser Etchings
function createMasterGpuBackplateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  // Anodized brushed gunmetal base
  ctx.fillStyle = 'rgb(28,36,52)'
  ctx.fillRect(0, 0, 1024, 512)

  // Brushed micro grain
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  for (let y = 0; y < 512; y += 2) {
    ctx.fillRect(0, y, 1024, 1)
  }

  // Carbon fiber weave panel
  ctx.fillStyle = 'rgb(15,20,32)'
  ctx.fillRect(35, 35, 954, 75)

  // Hexagonal flow-through ventilation array
  ctx.fillStyle = 'rgb(9,13,21)'
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 16; c++) {
      ctx.beginPath()
      ctx.arc(650 + c * 20, 160 + r * 22, 6.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Laser etched logo & typography
  ctx.font = 'bold 38px monospace'
  ctx.fillStyle = 'rgb(241,245,249)'
  ctx.fillText('GEFORCE RTX 4090', 80, 240)

  ctx.font = 'bold 20px monospace'
  ctx.fillStyle = 'rgb(0,238,252)'
  ctx.fillText('24GB GDDR6X // DIRECT-DIE FLOW-THROUGH', 80, 285)

  return new THREE.CanvasTexture(canvas)
}

// Fan Center Holographic Badge
function createFanCenterTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgb(7,10,18)'
  ctx.beginPath()
  ctx.arc(128, 128, 124, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgb(148,163,184)'
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.strokeStyle = 'rgb(0,238,252)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(128, 128, 80, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = 'rgb(255,255,255)'
  ctx.font = 'bold 34px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 128, 128)

  return new THREE.CanvasTexture(canvas)
}

const PART_LABELS: { id: ComponentPartId; label: string; top: string; left: string }[] = [
  { id: 'cooling', label: 'COOLING', top: '16%', left: '50%' },
  { id: 'cpu', label: 'CPU', top: '38%', left: '40%' },
  { id: 'ram', label: 'MEMORY', top: '38%', left: '64%' },
  { id: 'gpu', label: 'GPU', top: '72%', left: '50%' },
]

export default function RigVisualizer({
  categoryLinks = {},
}: {
  categoryLinks?: RigCategoryLinks
}) {
  const router = useRouter()
  const mountRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [webglFailed, setWebglFailed] = useState(false)
  const [activeTheme, setActiveTheme] = useState<(typeof THEMES)[number]>(THEMES[0])
  const [activeHover, setActiveHover] = useState<ComponentPartId | null>(null)
  const [activeExtract, setActiveExtract] = useState<ComponentPartId | null>(null)
  const [impactNotice, setImpactNotice] = useState<{ active: boolean; label: string }>({
    active: false,
    label: '',
  })

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseVecRef = useRef(new THREE.Vector2())

  // Extract → navigate intent lives in a ref so the animation loop /
  // pointer handlers never go stale.
  const pendingNavRef = useRef<ComponentPartId | null>(null)
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mirror hover/extract state into refs — the []-dep rAF loop below would
  // otherwise close over stale nulls and never detach/inspect parts.
  const activeHoverRef = useRef<ComponentPartId | null>(null)
  const activeExtractRef = useRef<ComponentPartId | null>(null)
  useEffect(() => {
    activeHoverRef.current = activeHover
  }, [activeHover])
  useEffect(() => {
    activeExtractRef.current = activeExtract
  }, [activeExtract])

  const controlsRef = useRef({
    isDragging: false,
    mouseStart: { x: 0, y: 0 },
    currentRot: { x: 0.12, y: -0.42 },
    targetRot: { x: 0.12, y: -0.42 },
    distance: 22.0,
  })

  const partsRef = useRef<{
    gpuGroup: THREE.Group | null
    cpuGroup: THREE.Group | null
    coolingGroup: THREE.Group | null
    ramGroup: THREE.Group | null
    sideGlass: THREE.Mesh | null
    fanBlades: THREE.Mesh[]
    rgbMaterials: THREE.MeshStandardMaterial[]
    hardwareSpotlight: THREE.SpotLight | null
    interactiveHitboxes: { mesh: THREE.Object3D; id: ComponentPartId }[]
  }>({
    gpuGroup: null,
    cpuGroup: null,
    coolingGroup: null,
    ramGroup: null,
    sideGlass: null,
    fanBlades: [],
    rgbMaterials: [],
    hardwareSpotlight: null,
    interactiveHitboxes: [],
  })

  useEffect(() => {
    if (!canvasRef.current || !mountRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const width = mountRef.current.clientWidth
    const height = mountRef.current.clientHeight

    const scene = new THREE.Scene()
    sceneRef.current = scene
    // Snapshot for the cleanup — partsRef.current fields are reassigned
    // during setup; the cleanup must clear THIS object's arrays, not whatever
    // the ref holds at unmount.
    const parts = partsRef.current

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100)
    camera.position.set(0, 1.8, 22.0)
    cameraRef.current = camera

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      // No WebGL (headless/blocked/GPU-less) — degrade to the static panel
      // instead of throwing out of the effect into the route error boundary.
      // Deferred a microtask: react-hooks/set-state-in-effect bans a sync
      // setState in the effect body (cascading render); the fallback still
      // paints on the same frame.
      queueMicrotask(() => setWebglFailed(true))
      return
    }
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    rendererRef.current = renderer

    // Studio lighting
    scene.add(new THREE.AmbientLight(0xffffff, 2.7))

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.8)
    keyLight.position.set(16, 24, 18)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xa5c4f8, 2.4)
    fillLight.position.set(-16, 12, 10)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x00eefc, 3.0)
    rimLight.position.set(0, -10, -15)
    scene.add(rimLight)

    const internalChamberLight = new THREE.PointLight(0xffffff, 5.0, 14)
    internalChamberLight.position.set(0, 3.6, 1.2)
    scene.add(internalChamberLight)

    const hardwareSpotlight = new THREE.SpotLight(0x00eefc, 0, 24, Math.PI / 3.5, 0.4)
    hardwareSpotlight.position.set(0, 5, 14)
    scene.add(hardwareSpotlight)
    partsRef.current.hardwareSpotlight = hardwareSpotlight

    // Contact ambient-occlusion ground shadow
    const groundCanvas = document.createElement('canvas')
    groundCanvas.width = 256
    groundCanvas.height = 256
    const gCtx = groundCanvas.getContext('2d')!
    const grad = gCtx.createRadialGradient(128, 128, 15, 128, 128, 120)
    grad.addColorStop(0, 'rgba(0,0,0,0.85)')
    grad.addColorStop(0.5, 'rgba(0,0,0,0.35)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    gCtx.fillStyle = grad
    gCtx.fillRect(0, 0, 256, 256)
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 14),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(groundCanvas),
        transparent: true,
        depthWrite: false,
      }),
    )
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.position.set(0, -4.55, 0.4)
    scene.add(groundMesh)

    // Master materials palette
    const pcbTexture = createMasterPcbTexture()
    const gpuBackplateTex = createMasterGpuBackplateTexture()
    const fanRogTex = createFanCenterTexture('ROG')
    const fanAioTex = createFanCenterTexture('AIO')

    const titaniumGunmetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.22,
    })
    const polishedSilverMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.15,
    })
    const brushedAluDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    })
    const copperHeatpipeMat = new THREE.MeshStandardMaterial({
      color: 0xb87333,
      metalness: 0.96,
      roughness: 0.16,
    })
    const motherboardMat = new THREE.MeshStandardMaterial({
      map: pcbTexture,
      color: 0xffffff,
      metalness: 0.45,
      roughness: 0.4,
    })
    const gpuBackplateMat = new THREE.MeshStandardMaterial({
      map: gpuBackplateTex,
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.25,
    })
    const goldCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.98,
      roughness: 0.1,
    })
    const rgbMat = new THREE.MeshStandardMaterial({
      color: THEMES[0].primary,
      emissive: THEMES[0].primary,
      emissiveIntensity: 2.5,
      roughness: 0.1,
    })
    partsRef.current.rgbMaterials.push(rgbMat)

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.98,
      opacity: 0.18,
      transparent: true,
      roughness: 0.02,
      ior: 1.5,
      thickness: 0.2,
    })

    const rootRig = new THREE.Group()
    scene.add(rootRig)

    // --- MOTHERBOARD ---
    const mbMesh = new THREE.Mesh(new THREE.BoxGeometry(6.6, 8.0, 0.15), motherboardMat)
    mbMesh.position.set(0, 0, -0.6)
    mbMesh.castShadow = true
    mbMesh.receiveShadow = true
    rootRig.add(mbMesh)

    const vrmTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.7), polishedSilverMat)
    vrmTop.position.set(-0.4, 2.9, -0.22)
    rootRig.add(vrmTop)

    for (let vg = 0; vg < 6; vg++) {
      const vFin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 0.6), titaniumGunmetalMat)
      vFin.position.set(-0.4, 2.65 + vg * 0.09, -0.22)
      rootRig.add(vFin)
    }

    const vrmLeft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.0, 0.75), polishedSilverMat)
    vrmLeft.position.set(-2.1, 1.25, -0.18)
    rootRig.add(vrmLeft)

    const m2Shield = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 0.28), polishedSilverMat)
    m2Shield.position.set(0.4, -0.5, -0.4)
    rootRig.add(m2Shield)

    for (let c = 0; c < 5; c++) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 16), goldCoreMat)
      cap.position.set(-2.5, -1.8 - c * 0.35, -0.38)
      rootRig.add(cap)
    }

    const atxPlug = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.32), titaniumGunmetalMat)
    atxPlug.position.set(3.1, 1.2, -0.38)
    rootRig.add(atxPlug)

    for (let s = 0; s < 4; s++) {
      const dimmSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.2), titaniumGunmetalMat)
      dimmSlot.position.set(0.85 + s * 0.42, 1.25, -0.42)
      rootRig.add(dimmSlot)
    }

    // --- CPU GROUP ---
    const cpuGroup = new THREE.Group()
    rootRig.add(cpuGroup)
    partsRef.current.cpuGroup = cpuGroup

    const socketBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.1), titaniumGunmetalMat)
    socketBase.position.set(-0.4, 1.2, -0.52)
    rootRig.add(socketBase)

    const socketFrame = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.65, 0.16), polishedSilverMat)
    socketFrame.position.set(-0.4, 1.2, -0.46)
    cpuGroup.add(socketFrame)

    const cpuIhs = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 0.2), goldCoreMat)
    cpuIhs.position.set(-0.4, 1.2, -0.35)
    cpuGroup.add(cpuIhs)

    const siliconDie = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.05), rgbMat)
    siliconDie.position.set(-0.4, 1.2, -0.24)
    cpuGroup.add(siliconDie)

    const leverArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), polishedSilverMat)
    leverArm.position.set(0.55, 1.2, -0.39)
    cpuGroup.add(leverArm)

    partsRef.current.interactiveHitboxes.push({ mesh: cpuGroup, id: 'cpu' })

    // --- COOLING GROUP ---
    const coolingGroup = new THREE.Group()
    rootRig.add(coolingGroup)
    partsRef.current.coolingGroup = coolingGroup

    const pumpMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.58, 36),
      titaniumGunmetalMat,
    )
    pumpMesh.rotation.x = Math.PI / 2
    pumpMesh.position.set(-0.4, 1.2, 0.08)
    coolingGroup.add(pumpMesh)

    for (const [radius, tube, z] of [
      [0.8, 0.06, 0.38],
      [0.6, 0.05, 0.32],
      [0.4, 0.05, 0.26],
    ] as const) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 16, 36), rgbMat)
      ring.position.set(-0.4, 1.2, z)
      coolingGroup.add(ring)
    }

    const pumpLogo = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 24),
      new THREE.MeshStandardMaterial({ map: fanAioTex, roughness: 0.2 }),
    )
    pumpLogo.position.set(-0.4, 1.2, 0.39)
    coolingGroup.add(pumpLogo)

    for (const fit of [0.15, -0.15]) {
      const fitting = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.25, 16),
        polishedSilverMat,
      )
      fitting.position.set(-0.4 + fit * 2, 1.6, 0.18)
      coolingGroup.add(fitting)
    }

    const radCore = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.58, 1.85), polishedSilverMat)
    radCore.position.set(0, 4.3, 0.2)
    coolingGroup.add(radCore)

    for (let f = 0; f < 3; f++) {
      const fX = -2.1 + f * 2.1

      const fanHousing = new THREE.Mesh(
        new THREE.BoxGeometry(1.95, 0.48, 1.75),
        titaniumGunmetalMat,
      )
      fanHousing.position.set(fX, 3.82, 0.2)
      coolingGroup.add(fanHousing)

      const fHalo = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 12, 32), rgbMat)
      fHalo.position.set(fX, 3.82, 0.2)
      fHalo.rotation.x = Math.PI / 2
      coolingGroup.add(fHalo)

      const fHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.12, 20),
        new THREE.MeshStandardMaterial({ map: fanAioTex }),
      )
      fHub.position.set(fX, 3.82, 0.2)
      fHub.rotation.x = Math.PI / 2
      coolingGroup.add(fHub)

      for (let b = 0; b < 7; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.14), polishedSilverMat)
        blade.position.set(fX, 3.82, 0.2)
        blade.rotation.z = (b * Math.PI) / 3.5
        coolingGroup.add(blade)
        partsRef.current.fanBlades.push(blade)
      }
    }

    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.4,
    })
    const tubeCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 1.5, 0.2),
      new THREE.Vector3(0.5, 2.6, 0.9),
      new THREE.Vector3(1.3, 3.5, 0.7),
      new THREE.Vector3(1.9, 4.0, 0.3),
    ])
    coolingGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tubeCurve1, 30, 0.14, 12, false), tubeMat))
    const tubeCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.6, 1.5, 0.2),
      new THREE.Vector3(0.0, 2.8, 1.1),
      new THREE.Vector3(0.9, 3.6, 0.9),
      new THREE.Vector3(1.5, 4.0, 0.3),
    ])
    coolingGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tubeCurve2, 30, 0.14, 12, false), tubeMat))

    partsRef.current.interactiveHitboxes.push({ mesh: coolingGroup, id: 'cooling' })

    // --- RAM GROUP ---
    const ramGroup = new THREE.Group()
    rootRig.add(ramGroup)
    partsRef.current.ramGroup = ramGroup

    for (let r = 0; r < 2; r++) {
      const rX = 1.25 + r * 0.45
      const ramBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.35, 0.7), polishedSilverMat)
      ramBody.position.set(rX, 1.25, -0.2)
      ramGroup.add(ramBody)

      const ramInlay = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.4), brushedAluDarkMat)
      ramInlay.position.set(rX, 1.2, -0.2)
      ramGroup.add(ramInlay)

      const ramDiffuser = new THREE.Mesh(new THREE.BoxGeometry(0.17, 2.35, 0.16), rgbMat)
      ramDiffuser.position.set(rX, 1.25, 0.18)
      ramGroup.add(ramDiffuser)
    }

    partsRef.current.interactiveHitboxes.push({ mesh: ramGroup, id: 'ram' })

    // --- GPU GROUP ---
    const gpuGroup = new THREE.Group()
    rootRig.add(gpuGroup)
    partsRef.current.gpuGroup = gpuGroup

    const gpuShroud = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.65, 2.45), titaniumGunmetalMat)
    gpuShroud.position.set(0.1, -1.2, 1.0)
    gpuShroud.castShadow = true
    gpuGroup.add(gpuShroud)

    for (let fin = 0; fin < 30; fin++) {
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.45, 2.25), polishedSilverMat)
      finMesh.position.set(-2.9 + fin * 0.2, -1.2, 1.0)
      gpuGroup.add(finMesh)
    }

    for (let hp = 0; hp < 5; hp++) {
      const pipeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 5.9, 16),
        copperHeatpipeMat,
      )
      pipeMesh.rotation.z = Math.PI / 2
      pipeMesh.position.set(0.1, -0.9 - hp * 0.14, 1.0)
      gpuGroup.add(pipeMesh)
    }

    const gpuBackplate = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 2.4), gpuBackplateMat)
    gpuBackplate.position.set(0.1, -0.34, 1.0)
    gpuGroup.add(gpuBackplate)

    const gpuLightbar = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.18, 0.14), rgbMat)
    gpuLightbar.position.set(0.1, -0.38, 2.24)
    gpuGroup.add(gpuLightbar)

    for (let gf = 0; gf < 3; gf++) {
      const gX = -1.9 + gf * 1.9
      const gRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 16, 32), rgbMat)
      gRim.position.set(gX, -2.02, 1.0)
      gRim.rotation.x = Math.PI / 2
      gpuGroup.add(gRim)

      const gHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.12, 20),
        new THREE.MeshStandardMaterial({ map: fanRogTex, metalness: 0.6, roughness: 0.3 }),
      )
      gHub.position.set(gX, -2.0, 1.0)
      gpuGroup.add(gHub)

      for (let gb = 0; gb < 11; gb++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.15), polishedSilverMat)
        blade.position.set(gX, -2.0, 1.0)
        blade.rotation.y = (gb * Math.PI) / 5.5
        gpuGroup.add(blade)
        partsRef.current.fanBlades.push(blade)
      }
    }

    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 1.25), polishedSilverMat)
    bracket.position.set(-3.15, -1.2, 0.8)
    gpuGroup.add(bracket)

    const pcieFingers = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 0.06), goldCoreMat)
    pcieFingers.position.set(0.1, -0.25, -0.2)
    gpuGroup.add(pcieFingers)

    const gpuCableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.8, -0.38, 2.15),
      new THREE.Vector3(2.2, -1.2, 2.3),
      new THREE.Vector3(2.4, -2.6, 1.8),
      new THREE.Vector3(2.2, -3.4, 0.5),
    ])
    gpuGroup.add(new THREE.Mesh(new THREE.TubeGeometry(gpuCableCurve, 24, 0.12, 10, false), tubeMat))

    partsRef.current.interactiveHitboxes.push({ mesh: gpuGroup, id: 'gpu' })

    // --- CHASSIS ---
    const psuBox = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.85, 3.3), titaniumGunmetalMat)
    psuBox.position.set(0, -3.5, 0.5)
    psuBox.receiveShadow = true
    rootRig.add(psuBox)

    const psuPlate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.06), rgbMat)
    psuPlate.position.set(-0.8, -3.2, 2.16)
    rootRig.add(psuPlate)

    const rearFrame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9.4, 3.5), titaniumGunmetalMat)
    rearFrame.position.set(-3.8, 0.2, 0.5)
    rootRig.add(rearFrame)

    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.45, 3.5), titaniumGunmetalMat)
    topFrame.position.set(0, 4.85, 0.5)
    rootRig.add(topFrame)

    for (const fx of [-3.3, 3.3]) {
      for (const fz of [-0.9, 1.9]) {
        const foot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.38, 0.45, 20),
          polishedSilverMat,
        )
        foot.position.set(fx, -4.42, fz)
        rootRig.add(foot)
      }
    }

    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(7.5, 9.0, 0.06), glassMat)
    sideGlass.position.set(0, 0.3, 2.22)
    rootRig.add(sideGlass)
    partsRef.current.sideGlass = sideGlass

    // Render loop
    let animationFrameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      if (!reducedMotion) {
        partsRef.current.fanBlades.forEach((blade) => {
          blade.rotation.y += delta * 14
        })
        const glow = 2.0 + Math.sin(time * 2.8) * 0.4
        partsRef.current.rgbMaterials.forEach((mat) => {
          mat.emissiveIntensity = glow
        })
      }

      const ctrl = controlsRef.current
      ctrl.currentRot.x += (ctrl.targetRot.x - ctrl.currentRot.x) * 0.08
      ctrl.currentRot.y += (ctrl.targetRot.y - ctrl.currentRot.y) * 0.08

      const radius = ctrl.distance
      camera.position.x = radius * Math.sin(ctrl.currentRot.y) * Math.cos(ctrl.currentRot.x)
      camera.position.y = radius * Math.sin(ctrl.currentRot.x) + 0.4
      camera.position.z = radius * Math.cos(ctrl.currentRot.y) * Math.cos(ctrl.currentRot.x)
      camera.lookAt(0, 0.2, 0.4)

      const activeTarget =
        activeHoverRef.current || activeExtractRef.current || pendingNavRef.current

      if (partsRef.current.sideGlass) {
        const targetGlassZ = activeTarget ? 4.5 : 2.22
        const targetGlassOpacity = activeTarget ? 0.05 : 0.2
        partsRef.current.sideGlass.position.z +=
          (targetGlassZ - partsRef.current.sideGlass.position.z) * 0.1
        glassMat.opacity += (targetGlassOpacity - glassMat.opacity) * 0.1
      }

      if (partsRef.current.gpuGroup) {
        const isTarget = activeTarget === 'gpu'
        partsRef.current.gpuGroup.position.z += ((isTarget ? 6.5 : 0) - partsRef.current.gpuGroup.position.z) * 0.12
        partsRef.current.gpuGroup.rotation.y += ((isTarget ? 0.22 : 0) - partsRef.current.gpuGroup.rotation.y) * 0.12
        partsRef.current.gpuGroup.rotation.x += ((isTarget ? 0.15 : 0) - partsRef.current.gpuGroup.rotation.x) * 0.12
      }

      if (partsRef.current.cpuGroup) {
        const isTarget = activeTarget === 'cpu'
        partsRef.current.cpuGroup.position.z += ((isTarget ? 5.8 : 0) - partsRef.current.cpuGroup.position.z) * 0.12
        partsRef.current.cpuGroup.rotation.y += ((isTarget ? -0.25 : 0) - partsRef.current.cpuGroup.rotation.y) * 0.12
        partsRef.current.cpuGroup.rotation.x += ((isTarget ? 0.18 : 0) - partsRef.current.cpuGroup.rotation.x) * 0.12
      }

      if (partsRef.current.coolingGroup) {
        const isTarget = activeTarget === 'cooling'
        const autoLiftForCpu = activeTarget === 'cpu' ? 2.5 : 0
        const targetY = isTarget ? 3.5 : autoLiftForCpu
        const targetZ = isTarget ? 4.5 : activeTarget === 'cpu' ? 1.0 : 0
        partsRef.current.coolingGroup.position.y += (targetY - partsRef.current.coolingGroup.position.y) * 0.12
        partsRef.current.coolingGroup.position.z += (targetZ - partsRef.current.coolingGroup.position.z) * 0.12
      }

      if (partsRef.current.ramGroup) {
        const isTarget = activeTarget === 'ram'
        partsRef.current.ramGroup.position.y += ((isTarget ? 5.0 : 0) - partsRef.current.ramGroup.position.y) * 0.12
        partsRef.current.ramGroup.position.z += ((isTarget ? 2.2 : 0) - partsRef.current.ramGroup.position.z) * 0.12
        partsRef.current.ramGroup.rotation.x += ((isTarget ? -0.15 : 0) - partsRef.current.ramGroup.rotation.x) * 0.12
      }

      if (partsRef.current.hardwareSpotlight) {
        const targetIntensity = activeTarget ? 7.5 : 0
        partsRef.current.hardwareSpotlight.intensity +=
          (targetIntensity - partsRef.current.hardwareSpotlight.intensity) * 0.15
      }

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return
      const w = mountRef.current.clientWidth
      const h = mountRef.current.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
        for (const mat of mats as THREE.MeshStandardMaterial[]) {
          // material.dispose() does not release texture GPU memory — the
          // CanvasTextures (PCB traces, backplate, fan decals, ground
          // gradient) need explicit dispose or remounts accumulate VRAM.
          if (mat.map) mat.map.dispose()
          if (mat.emissiveMap) mat.emissiveMap.dispose()
          mat.dispose()
        }
      })
      renderer.dispose()
      // No forceContextLoss: under React StrictMode this [] effect re-runs on
      // the SAME canvas element, and getContext('webgl2') would hand the next
      // renderer the already-lost context (permanently blank canvas in dev).
      // dispose() alone releases the GPU resources we own; the context itself
      // is reused by the remount.
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      parts.fanBlades = []
      parts.rgbMaterials = []
      parts.interactiveHitboxes = []
    }
  }, [])

  // Theme color updates
  useEffect(() => {
    if (!partsRef.current.rgbMaterials.length) return
    const color = new THREE.Color(activeTheme.primary)
    partsRef.current.rgbMaterials.forEach((mat) => {
      mat.color = color
      mat.emissive = color
    })
    if (partsRef.current.hardwareSpotlight) {
      partsRef.current.hardwareSpotlight.color = color
    }
  }, [activeTheme])

  const handlePointerDown = (e: React.PointerEvent) => {
    // Label buttons overlay the canvas — don't start a camera drag when the
    // pointerdown lands on a control.
    if ((e.target as HTMLElement).closest('button')) return
    controlsRef.current.isDragging = true
    controlsRef.current.mouseStart = { x: e.clientX, y: e.clientY }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (controlsRef.current.isDragging) {
      const deltaX = e.clientX - controlsRef.current.mouseStart.x
      const deltaY = e.clientY - controlsRef.current.mouseStart.y
      controlsRef.current.targetRot.y -= deltaX * 0.007
      controlsRef.current.targetRot.x = Math.max(
        -Math.PI / 4,
        Math.min(Math.PI / 4, controlsRef.current.targetRot.x + deltaY * 0.007),
      )
      controlsRef.current.mouseStart = { x: e.clientX, y: e.clientY }
    } else if (mountRef.current && cameraRef.current && !activeExtract) {
      const rect = mountRef.current.getBoundingClientRect()
      mouseVecRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseVecRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current)
      const intersects = raycasterRef.current.intersectObjects(
        partsRef.current.interactiveHitboxes.map((h) => h.mesh),
        true,
      )

      let matchedId: ComponentPartId | null = null
      if (intersects.length > 0) {
        let currentObj: THREE.Object3D | null = intersects[0].object
        while (currentObj && !matchedId) {
          const found = partsRef.current.interactiveHitboxes.find((h) => h.mesh === currentObj)
          if (found) matchedId = found.id
          currentObj = currentObj.parent
        }
      }
      if (matchedId !== activeHover) setActiveHover(matchedId)
    }
  }

  const handlePointerUp = () => {
    controlsRef.current.isDragging = false
  }

  const handleResetCamera = () => {
    playTickSound()
    controlsRef.current.targetRot = { x: 0.12, y: -0.42 }
    pendingNavRef.current = null
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current)
      navTimerRef.current = null
    }
    setActiveExtract(null)
    setActiveHover(null)
  }

  // Extract → (per plan §26) navigate to that part's category; a second
  // click on an extracted part snap-mounts it back.
  const triggerComponent = (part: ComponentPartId) => {
    if (activeExtract === part) {
      playMountSound()
      playSparkleSound()
      pendingNavRef.current = null
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current)
        navTimerRef.current = null
      }
      setActiveExtract(null)
      setImpactNotice({ active: true, label: `${part.toUpperCase()} SNAP-MOUNTED INTO MOTHERBOARD` })
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
      noticeTimerRef.current = setTimeout(
        () => setImpactNotice({ active: false, label: '' }),
        1500,
      )
    } else {
      playTickSound()
      pendingNavRef.current = part
      setActiveExtract(part)
      // Clicking a second part inside the 420ms window must not leave the
      // FIRST part's nav timer armed — it would push the wrong slug mid-flight.
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
      const slug = categoryLinks[part]
      navTimerRef.current = slug
        ? setTimeout(() => router.push(`/shop/${slug}`), 420)
        : null
    }
  }

  return (
    <div
      ref={mountRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="nx-rig"
    >
      {webglFailed ? (
        <div className="nx-rig__fallback" role="note">
          <p>3D preview unavailable — WebGL is off or unsupported.</p>
          <p>Use the part labels to jump straight to a category.</p>
        </div>
      ) : (
        <canvas ref={canvasRef} className="nx-rig__canvas" />
      )}

      <div className="nx-rig__top">
        <p className="nx-rig__badge">
          <span className="nx-rig__badge-dot" aria-hidden />
          <span className="nx-rig__badge-name">BMR 3D</span>
          <span className="nx-rig__badge-sep" aria-hidden>/</span>
          <span>Atelier rig</span>
        </p>

        <div className="nx-rig__tools">
          <div className="nx-rig__dots" role="group" aria-label="Chamber lighting">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  playTickSound()
                  setActiveTheme(theme)
                }}
                className={activeTheme.id === theme.id ? 'nx-rig__dot nx-rig__dot--active' : 'nx-rig__dot'}
                style={{ backgroundColor: new THREE.Color(theme.primary).getStyle() }}
                title={theme.name}
                aria-label={`${theme.name} lighting`}
                aria-pressed={activeTheme.id === theme.id}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleResetCamera}
            className="nx-rig__icon-btn"
            title="Reset camera"
            aria-label="Reset camera"
          >
            <RotateCcw size={14} aria-hidden />
          </button>
        </div>
      </div>

      <div className="nx-rig__labels">
        {PART_LABELS.map((part) => (
          <button
            key={part.id}
            type="button"
            className={
              activeHover === part.id || activeExtract === part.id
                ? 'nx-rig__label nx-rig__label--active'
                : 'nx-rig__label'
            }
            style={{ top: part.top, left: part.left }}
            onMouseEnter={() => {
              playTickSound()
              setActiveHover(part.id)
            }}
            onMouseLeave={() => setActiveHover(null)}
            onFocus={() => setActiveHover(part.id)}
            onBlur={() => setActiveHover(null)}
            onClick={() => triggerComponent(part.id)}
          >
            <span className="nx-rig__label-dot" aria-hidden />
            <span>{part.label}</span>
          </button>
        ))}
      </div>

      {impactNotice.active && (
        <div className="nx-rig__notice" role="status">
          <Sparkles size={16} className="nx-rig__notice-icon" aria-hidden />
          <span>{impactNotice.label}</span>
        </div>
      )}

      <p className="nx-rig__hint">
        <span>Hover or click labels to remove components</span>
        <span aria-hidden>&bull;</span>
        <span>Click again to snap-mount</span>
        <span aria-hidden>&bull;</span>
        <span>Drag to orbit</span>
      </p>
    </div>
  )
}

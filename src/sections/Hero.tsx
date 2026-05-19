import { useMemo, type CSSProperties } from "react"
import "./Hero.css"

type PetalStyle = CSSProperties & {
  [key: `--${string}`]: string | number
}

type Range = [number, number]

type FloatingRoute = {
  startX: Range
  startY: Range
  midX: Range
  midY: Range
  endX: Range
  endY: Range
  weight: number
}

type RestingPetalPlacement = {
  left: number
  top: number
  rotate: number
  delay: number
  size?: number
  opacity?: number
  startX?: string
  startY?: string
}

const backPetals = Array.from({ length: 18 }, (_, index) => index + 1)
const frontPetals = Array.from({ length: 10 }, (_, index) => index + 1)

const restingPetalPlacements: RestingPetalPlacement[] = [
  { left: 8, top: -0.03, rotate: -80, delay: 0, size: 0.95 },
  { left: 25.1, top: 0.17, rotate: 40, delay: 6, size: 1.02 },
  { left: 74, top: 0.23, rotate: 60, delay: 8, size: 0.98 },
  { left: 14.5, top: 0.16, rotate: 55, delay: 13, size: 1.04 },
  { left: 72.3, top: 0.09, rotate: -45, delay: 21 },
  { left: 19.4, top: 0.14, rotate: 275, delay: 21, size: 0.92 },
  { left: 12, top: 0.05, rotate: -26, delay: 23, size: 0.96 },
  { left: 85.5, top: 0.26, rotate: 130, delay: 30, size: 0.9 },
  { left: 17.5, top: 0.04, rotate: 260, delay: 32, size: 1.02 },
  { left: 47.6, top: 0.16, rotate: -30, delay: 40, size: 0.94 },
  { left: 80, top: 0.14, rotate: 110, delay: 42, size: 0.96 },
  { left: 13.8, top: -0.04, rotate: -55, delay: 46, size: 1.04 },
  { left: 64, top: -0.04, rotate: 80, delay: 47, size: 0.92 },
  { left: 75.8, top: 0.09, rotate: -50, delay: 50, size: 1.02 },
  { left: 23.4, top: 0.08, rotate: 55, delay: 57, size: 0.9 },
]

const floatingRoutes: FloatingRoute[] = [
  // Main route: top/right to bottom/left. This is closest to your original orange path.
  {
    startX: [88, 125],
    startY: [-18, 8],
    midX: [45, 75],
    midY: [42, 68],
    endX: [-35, 5],
    endY: [105, 125],
    weight: 5,
  },
  // Upper route: stays higher and sweeps across the top-left area.
  {
    startX: [55, 105],
    startY: [-20, 4],
    midX: [25, 60],
    midY: [12, 32],
    endX: [-25, 10],
    endY: [36, 68],
    weight: 2,
  },
  // Center route: passes closer to the title area.
  {
    startX: [78, 120],
    startY: [-10, 22],
    midX: [42, 68],
    midY: [34, 54],
    endX: [-25, 12],
    endY: [72, 105],
    weight: 3,
  },
  // Lower route: adds motion around the lower-right/lower-middle area.
  {
    startX: [92, 126],
    startY: [18, 48],
    midX: [58, 88],
    midY: [58, 82],
    endX: [-12, 32],
    endY: [98, 122],
    weight: 2,
  },
]

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function randomFromRange([min, max]: Range) {
  return randomBetween(min, max)
}

function formatValue(value: number, unit: string) {
  return `${Number(value.toFixed(2))}${unit}`
}

function pickRoute() {
  const totalWeight = floatingRoutes.reduce((sum, route) => sum + route.weight, 0)
  let randomWeight = randomBetween(0, totalWeight)

  for (const route of floatingRoutes) {
    randomWeight -= route.weight

    if (randomWeight <= 0) {
      return route
    }
  }

  return floatingRoutes[0]
}

function createFloatingPetalStyle(layer: "back" | "front"): PetalStyle {
  const route = pickRoute()
  const duration = randomBetween(layer === "back" ? 20 : 15, layer === "back" ? 34 : 24)
  const width = randomBetween(layer === "back" ? 8 : 10, layer === "back" ? 13 : 16)
  const height = width * randomBetween(1.45, 1.75)

  return {
    "--start-x": formatValue(randomFromRange(route.startX), "vw"),
    "--start-y": formatValue(randomFromRange(route.startY), "vh"),
    "--mid-x": formatValue(randomFromRange(route.midX), "vw"),
    "--mid-y": formatValue(randomFromRange(route.midY), "vh"),
    "--end-x": formatValue(randomFromRange(route.endX), "vw"),
    "--end-y": formatValue(randomFromRange(route.endY), "vh"),
    "--duration": formatValue(duration, "s"),
    "--delay": formatValue(randomBetween(-duration, 0), "s"),
    "--petal-width": formatValue(width, "px"),
    "--petal-height": formatValue(height, "px"),
    "--petal-opacity": Number(randomBetween(layer === "back" ? 0.35 : 0.55, layer === "back" ? 0.62 : 0.9).toFixed(2)),
    "--end-rotate": formatValue(randomBetween(300, 760), "deg"),
  }
}

function createRestingPetalStyle(placement: RestingPetalPlacement, index: number): PetalStyle {
  const size = placement.size ?? 1

  return {
    top: `${placement.top}em`,
    left: `${placement.left}%`,
    zIndex: index + 1,
    "--delay": `${placement.delay}s`,
    "--start-x": placement.startX ?? "80vw",
    "--start-y": placement.startY ?? "-100vh",
    "--petal-width": `${0.14 * size}em`,
    "--petal-height": `${0.22 * size}em`,
    "--petal-opacity": placement.opacity ?? 0.9,
    "--rest-rotate": `${placement.rotate}deg`,
  }
}

function Hero() {
  const backPetalStyles = useMemo(
    () => backPetals.map(() => createFloatingPetalStyle("back")),
    [],
  )

  const frontPetalStyles = useMemo(
    () => frontPetals.map(() => createFloatingPetalStyle("front")),
    [],
  )

  const restingPetalStyles = useMemo(
    () => restingPetalPlacements.map(createRestingPetalStyle),
    [],
  )

  return (
    <section className="hero">
      {/* Petals flowing behind the name */}
      <div className="petal-layer petal-layer-back" aria-hidden="true">
        {backPetals.map((petalNumber, index) => (
          <span
            key={`back-${petalNumber}`}
            className="floating-petal floating-petal-back"
            style={backPetalStyles[index]}
          />
        ))}
      </div>

      {/* Main hero content */}
      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-title-text">Drew Bae</span>

          {/* Petals that land and stay on the text */}
          <span className="resting-petal-group" aria-hidden="true">
            {restingPetalPlacements.map((_, index) => (
              <span
                key={`resting-${index + 1}`}
                className="resting-petal"
                style={restingPetalStyles[index]}
              />
            ))}
          </span>
        </h1>
      </div>

      {/* Petals flowing in front of the name */}
      <div className="petal-layer petal-layer-front" aria-hidden="true">
        {frontPetals.map((petalNumber, index) => (
          <span
            key={`front-${petalNumber}`}
            className="floating-petal floating-petal-front"
            style={frontPetalStyles[index]}
          />
        ))}
      </div>
    </section>
  )
}

export default Hero

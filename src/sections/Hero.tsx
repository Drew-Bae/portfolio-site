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

const backPetals = Array.from({ length: 18 }, (_, index) => index + 1)
const restingPetals = Array.from({ length: 15 }, (_, index) => index + 1)
const frontPetals = Array.from({ length: 10 }, (_, index) => index + 1)

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

function Hero() {
  const backPetalStyles = useMemo(
    () => backPetals.map(() => createFloatingPetalStyle("back")),
    [],
  )

  const frontPetalStyles = useMemo(
    () => frontPetals.map(() => createFloatingPetalStyle("front")),
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
            {restingPetals.map((petalNumber) => (
              <span
                key={`resting-${petalNumber}`}
                className={`resting-petal resting-petal-${petalNumber}`}
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

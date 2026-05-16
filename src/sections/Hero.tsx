import "./Hero.css"

const backPetals = Array.from({ length: 10 }, (_, index) => index + 1)
const restingPetals = Array.from({ length: 15 }, (_, index) => index + 11)
const frontPetals = Array.from({ length: 8 }, (_, index) => index + 26)


function Hero() {
  return (
    <section className="hero">
        {/*Petals flowing behind the name*/}
        <div className="petal-layer petal-layer-back" aria-hidden="true">
            {backPetals.map((petalNumber) => (
                <span
                    key={`back-${petalNumber}`}
                    className={`floating-petal floating-petal-back floating-petal-back-${petalNumber}`}
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
            {frontPetals.map((petalNumber) => (
                <span
                    key={`front-${petalNumber}`}
                    className={`floating-petal floating-petal-front floating-petal-front-${petalNumber}`}
                />
            ))}
        </div>
    </section>
  )
}

export default Hero
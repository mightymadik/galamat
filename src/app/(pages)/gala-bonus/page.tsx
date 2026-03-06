import Hero from "@/components/layout/galaBonusPage/hero/hero"
import Tutorial from "@/components/layout/galaBonusPage/tutorial/tutorial"

export const metadata = {
  title: "Gala Bonus — Galamat",
  description:
    "Gala Bonus - Запустите колесо удачи и купите квартиру со скидкой!",
}

export default function GalaBonus() {
    return (
       <>
       <div className="mt-[68px]">
            <Hero />
        </div>
        <Tutorial />
        </>
    )
}
import React, { useEffect, useRef, useState } from "react";
import { ActionGetProbabilities } from "@/app/actions/lottery/get-probabilities";
import { Spinner } from "@heroui/react";
import { formatKzt } from "@/utils/helpers";

interface IThisProps {
  idLoaded: (status: boolean) => void;
}

function BonusBlockCover({ idLoaded }: IThisProps) {
  const [prices, setPrices] = useState<IProbabilities[]>([]);

  useEffect(() => {
    ActionGetProbabilities().then((probabilities) => {
      setPrices(probabilities.data);
      idLoaded(true);
    });
  }, []);

  const rotateBlock = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="bonus md:ml-20">
        {prices.length ? (
          <div className="min-w-[650px] w-[650px] min-h-[650px] h-[650px] transform transition duration-[1s] gala-bonus-fortuna">
            <img
              src="/img/playgon-gal-bonus.svg"
              alt="playgon-gal-bonus"
              className="absolute left-[50%] top-[29px] transform translate-x-[-50%] z-10 w-[40px]"
            />
            <div className="w-full h-full transform rotate-[-21deg]">
              <div ref={rotateBlock} className="w-full h-full transition">
                <div className="w-full h-full bg-[#3579E0] flex-jc-c rounded-full transform relative overflow-hidden">
                  <div className="w-1/2 h-1/2 absolute top-0 right-0 playgon-top-right bg-blue flex-jc-c" />
                  <div className="w-1/2 h-1/2 absolute bottom-0 right-0 playgon-bottom-right bg-blue" />
                  <div className="w-1/2 h-1/2 absolute bottom-0 left-0 playgon-bottom-left bg-blue" />
                  <div className="w-1/2 h-1/2 absolute top-0 left-0 playgon-top-left bg-blue" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`solid-${i}`}
                      className="w-[98%] h-[3px] bg-white transform absolute left-[50%] top-[50%]"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                      }}
                    />
                  ))}
                </div>
                <div className="w-full h-full flex-jc-c border-[28px] border-[#21468B] rounded-full overflow-hidden absolute top-0 left-0 shadow-bonus">
                  <div className="play-btn cursor-pointer z-10 transition-[0.2s] transform active:scale-[0.96]" />
                </div>

                {prices.map((price, i) => (
                  <div
                    key={`price-${i}`}
                    className="absolute left-0 top-[50%] text-white text-[35px] font-bold w-full "
                    style={{
                      transform: `translateY(-50%) rotate(${i * 45 + 111}deg)`,
                    }}
                  >
                    <span className="transform rotate-180 inline-block w-[250px]">
                      {formatKzt(price.price).replace(/ /, ".")}
                    </span>

                    <span className="w-6 h-6 bg-[#FFAB36] shadow-yellow rounded-full absolute right-[2px] top-[50%] transform translate-y-[-50%]"></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex-jc-c">
            <Spinner color="white" />
          </div>
        )}
      </div>
    </>
  );
}

export default BonusBlockCover;

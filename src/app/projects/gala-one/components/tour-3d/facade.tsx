import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import clsx from "clsx";

interface IThisProps {
  onChangeZIndex: (index: boolean) => void;
}

function Facade({ onChangeZIndex }: IThisProps) {
  const [minMax, setMinMax] = useState<boolean>(false);

  useEffect(() => {
    if (minMax) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      onChangeZIndex(true);
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
      onChangeZIndex(false);
    }
  }, [minMax]);

  return (
    <div
      className={clsx("w-full relative", {
        "h-[100dvh] !fixed top-0 left-0 w-full z-[10000000]": minMax,
      })}
    >
      <Button
        className={clsx(
          "w-8 sm:w-10 h-8 sm:h-10 bg-white flex-jc-c absolute top-[-15px] right-[-15px] rounded-full border sm:border-[2px] border-[#7f0217] text-[#7f0217] cursor-pointer min-w-10",
          {
            "!top-4 !right-4": minMax,
          },
        )}
        onPress={() => setMinMax(!minMax)}
      >
        <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
      </Button>

      <iframe
        width="100%"
        height="600"
        src="https://astana3d.kz/3d/galamat/#pano24/76.6/24.7/90.0"
        frameBorder="0"
        className={clsx({
          "h-[70vh] rounded-[24px]": !minMax,
          "h-[100dvh]": minMax,
        })}
        allowFullScreen
      />
    </div>
  );
}

export default Facade;

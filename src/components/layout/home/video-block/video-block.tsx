import "./video-block.scss";
import { useRef, useState, useEffect } from "react";
import clsx from "clsx";

function VideoBlock() {
  const video = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [statusVideo, setStatusVideo] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const delayTimeout = useRef<NodeJS.Timeout | null>(null);

  function PlayPauseVideo() {
    if (video.current) {
      if (video.current.paused) {
        video.current.play();
        setStatusVideo(true);
      } else {
        video.current.pause();
        setStatusVideo(false);
      }
    }
  }

  function handleMouseMove() {
    setShowControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 1000);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener("mousemove", handleMouseMove);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && video.current && video.current.paused) {
          // Ցանցից ապահովվում ենք որ նախորդ timeout չլինի
          if (delayTimeout.current) {
            clearTimeout(delayTimeout.current);
          }

          delayTimeout.current = setTimeout(() => {
            video.current?.play();
            setStatusVideo(true);
          }, 1000);
        }
      },
      {
        threshold: 0.5,
      },
    );

    const container = containerRef.current;
    if (container) {
      observer.observe(container);
    }

    return () => {
      if (container) {
        observer.unobserve(container);
      }
      if (delayTimeout.current) {
        clearTimeout(delayTimeout.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="max-w-[3000px] w-full h-[500px] md:h-[770px] relative video-block mx-auto !mt-10 md:!mt-[100px]"
    >
      <video
        ref={video}
        loop
        muted
        playsInline
        className="w-full max-w-full h-full object-cover"
        poster="img/video-cover.webp"
      >
        <source src="img/video/galamat-cover.mp4" type="video/mp4" />
      </video>

      <div
        onClick={PlayPauseVideo}
        className={clsx(
          "transition-opacity duration-500 ease-in-out w-[90px] md:w-[160px] h-[90px] md:h-[160px] rounded-full flex-jc-c cursor-pointer bg-[#8498BB] absolute top-1/2 left-1/2 transform translate-x-[-50%] translate-y-[-50%]",
          {
            "opacity-100": showControls,
            "opacity-0 pointer-events-none": !showControls,
          },
        )}
      >
        {statusVideo ? (
          <i className="fa-solid fa-pause text-[40px] md:text-[70px] text-[#132C5E]"></i>
        ) : (
          <i className="fa-solid fa-play text-[40px] md:text-[70px] text-[#132C5E] ml-2"></i>
        )}
      </div>
    </div>
  );
}

export default VideoBlock;

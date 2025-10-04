"use client";

interface IThisProps {
  height?: number;
  className?: string;
}

function OurObjects({ height = 400, className }: IThisProps) {
  return (
    <div className="w-full rounded-[12px] overflow-hidden">
      <iframe
        src="https://yandex.com/map-widget/v1/?um=constructor%3A07c967583936d1afc1b27c3913907eb8a0a3f22bdb05c0046bbf78ace82c02c7&amp;source=constructor"
        width="100%"
        height={height}
        frameBorder="0"
        className={className}
      />
    </div>
  );
}

export default OurObjects;

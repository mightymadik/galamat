"use client";

export default function Tour() {
  return (
    <div>
      <div className="wrapper flex flex-col items-start gap-[32px] self-stretch px-[16px]">
        <div className="px-[16px] lg:px-0 flex items-start gap-[16px] self-stretch flex-col lg:flex-row">
          <h1 className="text-[#202028] text-[36px] font-medium leading-[100%] w-full max-w-[320px]">
            360 Тур
          </h1>
        </div>
        <iframe
          className="rounded-[32px]"
          src="https://astana3d.kz/3d/galamat/galaxystar/#pano24/54.6/11.8/64.3"
          frameBorder="0"
          width="100%"
          height="800px"
        ></iframe>
      </div>
    </div>
  );
}

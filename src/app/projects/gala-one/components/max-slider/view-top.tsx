import Image from "next/image";
import { PhotoProvider, PhotoView } from "react-photo-view";

function ViewTop() {
  return (
    <PhotoProvider loop={false}>
      <div className="w-full overflow-hidden rounded-[27px] shadow-inset">
        <PhotoView src="/img/gala-one/top-view-max.webp">
          <Image
            src="/img/gala-one/top-view-max.webp"
            alt="view top"
            width={2000}
            height={1500}
          />
        </PhotoView>
      </div>
    </PhotoProvider>
  );
}

export default ViewTop;

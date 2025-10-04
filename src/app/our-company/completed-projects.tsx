import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import Link from "next/link";
import { filesLink, SITE_URL } from "@/utils/consts";
import React, { useEffect, useState } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { ActionGetPageSection } from "@/app/actions/admin/section-components/get-section-components";
import moment from "moment";
import Image from "next/image";

interface IThisProps {
  onSuccess: (status: boolean) => void;
}

function CompletedProjects({ onSuccess }: IThisProps) {
  const $t = useTranslate();

  const [oldProjects, setOldProjects] = useState<IDataOldProjects[]>([]);

  useEffect(() => {
    ActionGetPageSection("company_old_projects").then((res: any) => {
      setOldProjects(res.data);
      onSuccess(true);
    });
  }, []);

  return (
    <div className="completed-projects !mt-[60px]">
      <div className="wrapper">
        <h2>{$t("completed_projects")}</h2>

        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={16}
          slidesPerView={3}
          loop={true}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
          className="completed-projects-swiper w-full"
          breakpoints={{
            300: {
              slidesPerView: 1,
              spaceBetween: 0,
            },
            768: {
              slidesPerView: 2,
              spaceBetween: 16,
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 16,
            },
          }}
        >
          {oldProjects.map((item, i) => (
            <SwiperSlide key={`home-ads-${i}`}>
              <Link
                href={SITE_URL.REAL_ESTATE}
                className="completed-projects-item cursor-pointer bg-white p-6 rounded-[16px] transition transform hover:scale-[1.01] origin-top-center hover:shadow"
              >
                <div className="relative">
                  <Image
                    src={`${filesLink}${item.image_url}`}
                    width={600}
                    height={1000}
                    alt={item.name}
                    className="w-full h-[500px] object-cover rounded-[12px] mb-4"
                  />
                  <span className="absolute right-0 bottom-10 bg-green-600 text-white px-4 rounded-[5px_0_0_5px]">
                    Сдан {moment(item.date).format("YYYY")}
                  </span>
                </div>
                <b className="name !mb-0">ЖК {item.name}</b>
                <span className="address min-h-[60px]">{item.address}</span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

export default CompletedProjects;

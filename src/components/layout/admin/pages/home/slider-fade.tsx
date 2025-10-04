import React, { useEffect, useState } from "react";
import { ActionCreateSliderFade } from "@/app/actions/admin/pages/home/slider-fade/create-slider-fade";
import { Spinner } from "@heroui/react";
import { ActionGetSlidersFade } from "@/app/actions/admin/pages/home/slider-fade/get-sliders-fade";
import { GetLanguage } from "@/app/actions/admin/language/get-languages";
import ModalUploadImageSlider from "@/components/layout/admin/pages/home/modal-upload-image-slider";
import { filesLink, filesLinkRemove } from "@/utils/consts";
import { RandomKey } from "@/utils/helpers";
import { ActionRemoveSliderFade } from "@/app/actions/admin/pages/home/slider-fade/remove-slider";
import { addToast } from "@heroui/react";
import axios from "axios";
import Image from "next/image";
import { ActionUpdateSliderSort } from "@/app/actions/slider-home/change-slider-home-index";

interface IThisProps {
  slider: "fade-slider" | "slider-carousel";
}

function SliderFade({ slider }: IThisProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [items, setItems] = useState<ISliderItem[] | null>(null);

  const [languages, setLanguages] = useState<ILanguage[]>([]);

  useEffect(() => {
    GetLanguage("parents").then((res) => {
      setLanguages(res.data);
    });
  }, [slider]);

  useEffect(UpdateSliders, [slider]);

  function UpdateSliders() {
    setItems(null);
    ActionGetSlidersFade(slider).then(({ data }) => {
      setItems(data as ISliderItem[]);
    });
  }

  function CreateParent() {
    setLoading(true);
    ActionCreateSliderFade(slider)
      .then(() => {
        UpdateSliders();
      })
      .finally(() => setLoading(false));
  }

  function RemoveParent(id: number, image_path: string[]) {
    image_path.forEach((item) => {
      axios
        .post(filesLinkRemove, {
          url: item,
        })
        .then(({ data }) => {
          console.log(data);
        });
    });

    addToast({
      title: "Удаляем ",
      color: "warning",
    });

    ActionRemoveSliderFade(id).then(() => {
      UpdateSliders();
      addToast({
        title: "Успешно удалено ",
        color: "success",
      });
    });
  }

  const [moadlUploadImage, setModalUpload] = useState<ISliderItem | null>(null);

  function changeSortIndex(id: number, value: string) {
    ActionUpdateSliderSort(id, +value).then(() => {
      addToast({
        title: "Информация успешно обновлено",
        color: "success",
      });
    });
  }

  return (
    <>
      {items ? (
        <div className="w-full grid grid-cols-4 gap-4">
          {items.map((item) =>
            item.children?.map((child) => (
              <div
                key={`slider-item-${child.id}`}
                onClick={() => setModalUpload(child)}
                className="w-full h-[200px] border rounded-[12px] group hover:border-blue cursor-pointer p-2 grid grid-cols-2 grid-rows-2 gap-2 relative"
              >
                <i
                  className="fa-solid fa-xmark absolute w-7 h-7 top-[-10px] left-[-10px] opacity-0 group-hover:opacity-100 transition transform hover:scale-[1.1] bg-black/70 rounded-full flex-jc-c text-white cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    RemoveParent(
                      child.id,
                      child.children?.map((s) => s.image_path) || [],
                    );
                  }}
                />

                {languages
                  .filter(
                    (lang) =>
                      !child.children?.some((_ch) => _ch.lang_key === lang.key),
                  )
                  .map((language) => (
                    <div
                      key={`lang-${language.key}`}
                      className="w-full border relative rounded-[8px] flex-jc-c"
                    >
                      <span className="px-2 rounded-[2px] absolute right-[-2px] top-[-2px] bg-blue text-white">
                        {language.name}
                      </span>
                      <span className="text-[11px] text-blue/50 leading-normal text-center">
                        Надо дополнить
                      </span>
                    </div>
                  ))}
                {child.children?.map((sub_child: any) => (
                  <div key={RandomKey()} className="relative">
                    <span className="px-2 rounded-[2px] absolute right-[-2px] top-[-2px] bg-blue text-white">
                      {sub_child.lang_key}
                    </span>
                    <Image
                      src={`${filesLink}${sub_child.image_path}`}
                      alt="img"
                      width={100}
                      height={100}
                      className="h-full w-full object-cover rounded-[6px]"
                    />
                  </div>
                ))}

                <label className="w-8 h-8 border overflow-hidden -right-2 -bottom-2 absolute rounded-[4px]">
                  <input
                    type="number"
                    className="w-full h-full text-center text-[14px]"
                    title="Номер очереди"
                    max={20}
                    defaultValue={child.sort_index}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => changeSortIndex(child.id, e.target.value)}
                  />
                </label>
              </div>
            )),
          )}

          <div
            className="w-full h-[200px] border rounded-[12px] flex-jc-c hover:border-blue cursor-pointer"
            onClick={CreateParent}
          >
            {loading ? (
              <Spinner color="danger" />
            ) : (
              <i className="fa-regular fa-plus text-[50px] text-black/50"></i>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-[200px] flex-jc-c">
          <Spinner color="danger" />
        </div>
      )}

      <ModalUploadImageSlider
        status={moadlUploadImage}
        onClose={() => setModalUpload(null)}
        languages={languages}
        onUpdate={UpdateSliders}
      />
    </>
  );
}

export default SliderFade;

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { filesLink, filesLinkRemove, filesLinkSave } from "@/utils/consts";
import { ActionCreateSliderFade } from "@/app/actions/admin/pages/home/slider-fade/create-slider-item";
import { addToast } from "@heroui/react";
import { Input } from "@heroui/react";
import { ActionCUpdateSliderFade } from "@/app/actions/admin/pages/home/slider-fade/update-url-slider-item";

interface IThisProps {
  status: ISliderItem | null;
  onClose: () => void;
  languages: ILanguage[];
  onUpdate: () => void;
}

function ModalUploadImageSlider({
  status,
  onClose,
  languages,
  onUpdate,
}: IThisProps) {
  const [child, setChild] = useState<ISliderItem | null>(null);
  const [urlSlider, setUrlSlider] = useState<string>("");

  useEffect(() => {
    setChild(status);
    setUrlSlider(status?.url || "");
  }, [status]);

  function updateChild(newChild: ISliderItem) {
    if (child) {
      const _child = { ...child };

      if (_child.children?.some((_c) => _c.lang_key === newChild.lang_key)) {
        _child.children = _child.children?.map((_ch: ISliderItem) => {
          if (_ch.lang_key === newChild.lang_key) {
            return newChild;
          } else {
            return _ch;
          }
        });
      } else {
        _child.children = _child.children
          ? [..._child.children, newChild]
          : [newChild];
      }
      setChild(_child);
    }
  }

  const [loadingUrl, setLoadingUrl] = useState<boolean>(false);

  function SaveUrlSlider() {
    if (urlSlider && child) {
      setLoadingUrl(true);
      ActionCUpdateSliderFade(child.id, urlSlider)
        .then(() => {
          addToast({
            title: "Успешно обновлено",
            color: "success",
          });
        })
        .finally(() => setLoadingUrl(false));
    }
  }

  function uploadImage(e: any, langKey: string) {
    const file = e.target.files[0];
    if (child && file) {
      const formData = new FormData();
      formData.append("image", file);

      addToast({
        title: "Подождите немного, не закрывайте страницу",
        color: "warning",
      });
      axios.post(filesLinkSave, formData).then(({ data }) => {
        if (data.status === "success") {
          ActionCreateSliderFade(child.id, langKey, data.url, urlSlider).then(
            (res) => {
              if (res.status === "updated") {
                axios.post(filesLinkRemove, res.oldImagePath).then(() => {
                  addToast({
                    title: "Успешно обновлено",
                    color: "success",
                  });
                });
              } else if (res.status === "created") {
                addToast({
                  title: "Успешно добавлено ",
                  color: "success",
                });
              }
              updateChild(res.data as ISliderItem);
              onUpdate();
            },
          );
        }
      });
    }
  }

  return (
    <Modal
      size="xl"
      isOpen={!!status}
      onOpenChange={() => {
        onClose();
        setUrlSlider("");
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Добавить картинку слайдера
        </ModalHeader>
        <ModalBody>
          <p className="text-black/70 text-[14px]">
            Здесь жаждого ячейка для каждого языка, на верху написано языка
          </p>

          <div className="relative">
            <Input
              label="URL"
              placeholder="/page-url"
              type="text"
              className="w-full"
              value={urlSlider}
              onChange={(e) => setUrlSlider(e.target.value)}
            />
            <Button
              className="absolute right-1 top-2"
              onPress={SaveUrlSlider}
              isLoading={loadingUrl}
            >
              Сохранить{" "}
            </Button>
          </div>

          <div className="w-full mb-4 mt-6 grid grid-cols-3 gap-4">
            {languages
              .filter(
                (lang) =>
                  !child?.children?.some((_ch) => _ch.lang_key === lang.key),
              )
              .map((language) => (
                <label
                  key={`lang--modal-${language.key}`}
                  className="w-full border border-blue/50 hover:border-blue cursor-pointer relative rounded-[8px] flex-jc-c h-[150px]"
                >
                  <input
                    type="file"
                    onChange={(e) => uploadImage(e, language.key || "")}
                    accept="image/jpeg, image/png, image/jpg, image/webp"
                    className="hidden"
                  />
                  <span className="px-2 rounded-[2px] absolute right-[-2px] top-[-2px] bg-blue text-white">
                    {language.name}
                  </span>
                  <span className="text-[11px] text-blue/50 leading-normal text-center">
                    Надо дополнить
                  </span>
                </label>
              ))}
            {child?.children?.map((sub_child) => (
              <label
                key={`lang--modal-have-${sub_child.id}`}
                className="w-full border border-blue/50 hover:border-blue cursor-pointer relative rounded-[8px] flex-jc-c h-[150px] overflow-hidden"
              >
                <span className="px-2 rounded-[2px] absolute right-[-2px] top-[-2px] bg-blue text-white">
                  {sub_child.lang_key}
                </span>
                <input
                  type="file"
                  onChange={(e) => uploadImage(e, sub_child.lang_key || "")}
                  accept="image/jpeg, image/png, image/jpg, image/webp"
                  className="hidden"
                />
                <img
                  src={`${filesLink}${sub_child.image_path}`}
                  alt="img"
                  className="h-full object-cover rounded-[6px]"
                />
              </label>
            ))}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ModalUploadImageSlider;

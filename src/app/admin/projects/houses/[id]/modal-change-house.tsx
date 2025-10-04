"use client";

import { useState, useEffect } from "react";
import { ActionGetObjectInfo } from "@/app/actions/admin/objects/get-object-info";
import { Spinner } from "@heroui/react";
import axios from "axios";
import { filesLink, filesLinkRemove, filesLinkSave } from "@/utils/consts";
import { ActionUpdateObjectInfo } from "@/app/actions/admin/objects/change-object-info";
import { addToast, Button } from "@heroui/react";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import CanvasEditorHouse from "@/app/admin/projects/houses/[id]/canvas-editor-house";
import { ActionGetHouseImages } from "@/app/actions/admin/objects/get-house-images";
import { ActionRemoveObject } from "@/app/actions/admin/objects/remove-object";

interface IThisProps {
  status: boolean;
  onClose: () => void;
  house: IHouse;
}

export default function ModalChangeHouse({
  status,
  onClose,
  house,
}: IThisProps) {
  const [objectInfo, setObjectInfo] = useState<IObjectData | null>(null);

  const [houseImage, setHouseImages] = useState<IObjectData[]>([]);

  const [selectedImageForEditing, setSelectedImageForEditing] =
    useState<IObjectData | null>(null);

  useEffect(UpdateHouseInfo, [status]);

  useEffect(UpdateImagesList, [objectInfo]);

  function UpdateImagesList() {
    if (objectInfo) {
      ActionGetHouseImages(objectInfo.id).then((res) => {
        setHouseImages(res.data as IObjectData[]);
      });
    }
  }

  function UpdateHouseInfo() {
    if (status) {
      ActionGetObjectInfo(house.id, "/house").then((res) => {
        if (res.status) {
          setObjectInfo(res.data as IObjectData);
        }
      });
    }
  }

  const [loadingUploding, setLoadingUploding] = useState<boolean>(false);
  function selectImage(e: any) {
    const file = e.target.files[0];
    if (file && objectInfo) {
      const formData = new FormData();
      formData.append("image", file);

      addToast({
        title: "Подождите немного",
        color: "warning",
      });

      setLoadingUploding(true);
      axios.post(filesLinkSave, formData).then(({ data }) => {
        if (data.status === "success") {
          addToast({
            title: "Осталось чуть чуть",
            color: "warning",
          });
          ActionUpdateObjectInfo({
            project_house_id: objectInfo?.project_house_id,
            parent_id: objectInfo.id,
            coordinates: "",
            image_path: data.url,
            api_url: objectInfo.api_url,
            color: "",
          })
            .then((res) => {
              if (res.status) {
                addToast({
                  title: "Успешно добавлено ",
                  color: "success",
                });
                UpdateImagesList();
              }
            })
            .finally(() => setLoadingUploding(false));
        }
      });
    }
  }

  function RemoveImageHouse(house: IObjectData) {
    axios
      .post(filesLinkRemove, {
        url: house.image_path,
      })
      .then(({ data }) => {
        if (data.status === "success") {
          ActionRemoveObject(house.id).then((_res) => {
            if (_res.status) {
              UpdateImagesList();
            }
          });
        }
      });
  }

  return (
    <Dialog fullScreen open={status} onClose={onClose}>
      <div className="w-full flex-jsb-c px-8">
        <DialogTitle>Добавить объект {house.title}</DialogTitle>
        <i
          className="fa-light fa-xmark cursor-pointer text-[30px] text-black/60"
          onClick={onClose}
        />
      </div>

      <DialogContent>
        {objectInfo ? (
          <>
            {selectedImageForEditing ? (
              <div>
                <div className="w-full max-w-[1300px] m-auto">
                  <Button
                    color="primary"
                    onPress={() => setSelectedImageForEditing(null)}
                  >
                    <i className="fa-solid fa-arrow-left mr-1"></i>
                    Назад
                  </Button>
                </div>
                <CanvasEditorHouse
                  objectInfo={selectedImageForEditing}
                  house={house}
                />
              </div>
            ) : (
              <div className="w-full grid grid-cols-4 gap-6">
                {houseImage.map((house) => (
                  <div
                    key={`house-id-${house.id}`}
                    className="w-full border overflow-hidden rounded-[12px] relative group"
                  >
                    <img
                      src={`${filesLink}${house.image_path}`}
                      alt=""
                      className="w-full h-full object-cover object-center"
                    />
                    <i
                      onClick={() => RemoveImageHouse(house)}
                      className="fa-solid fa-xmark absolute top-2 right-2 bg-white shadow rounded-full p-2 cursor-pointer w-8 h-8 flex-jc-c opacity-0 group-hover:opacity-100"
                    />
                    <Button
                      color="primary"
                      className="absolute right-4 bottom-4"
                      onPress={() => setSelectedImageForEditing(house)}
                    >
                      Добавить планы
                    </Button>
                  </div>
                ))}

                <label className="w-full h-[400px] flex-jc-c border-dashed border-[2px] hover:border-black rounded-[12px] flex-col gap-4 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={selectImage}
                  />
                  {loadingUploding ? (
                    <Spinner className="mb-2" />
                  ) : (
                    <i className="fa-light fa-plus text-black/50 text-[50px]"></i>
                  )}

                  <h2 className="text-black/50">Выбрать картинку </h2>
                </label>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-[400px] flex-jc-c">
            <Spinner />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

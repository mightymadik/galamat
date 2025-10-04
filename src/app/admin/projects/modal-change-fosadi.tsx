"use client";

import { useState, useEffect } from "react";
import { ActionGetObjectInfo } from "@/app/actions/admin/objects/get-object-info";
import CanvasEditor from "@/app/admin/projects/canvas-editor";
import { Spinner } from "@heroui/react";
import axios from "axios";
import { filesLinkSave } from "@/utils/consts";
import { addToast } from "@heroui/react";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { ActionUpdateFasadeInfo } from "@/app/actions/admin/objects/change-fasade-info";

interface IThisProps {
  status: boolean;
  onClose: () => void;
  project: IProjectStage;
}

export default function ModalChangeFosad({
  status,
  onClose,
  project,
}: IThisProps) {
  const [objectInfo, setObjectInfo] = useState<IObjectData | null>(null);

  useEffect(() => {
    if (status) {
      ActionGetObjectInfo(project.id, "/projects").then((res) => {
        if (res.status) {
          setObjectInfo(res.data as IObjectData);
        }
      });
    }
  }, [status]);

  function selectImage(e: any) {
    const file = e.target.files[0];
    if (file && objectInfo) {
      const formData = new FormData();
      formData.append("image", file);

      addToast({
        title: "Подождите немного",
        color: "warning",
      });

      axios.post(filesLinkSave, formData).then(({ data }) => {
        if (data.status === "success") {
          addToast({
            title: "Осталось чуть чуть",
            color: "warning",
          });
          ActionUpdateFasadeInfo(objectInfo?.id, "image_path", data.url).then(
            (res) => {
              if (res.status) {
                setObjectInfo(res.data as IObjectData);
                addToast({
                  title: "Успешно добавлено ",
                  color: "success",
                });
              }
            },
          );
        }
      });
    }
  }

  return (
    <Dialog fullScreen open={status} onClose={onClose}>
      <div className="w-full flex-jsb-c px-8">
        <DialogTitle>Добавить объект {project.title}</DialogTitle>
        <i
          className="fa-light fa-xmark cursor-pointer text-[30px] text-black/60"
          onClick={onClose}
        />
      </div>

      <DialogContent>
        {objectInfo ? (
          <>
            {objectInfo?.image_path ? (
              <CanvasEditor objectInfo={objectInfo} project={project} />
            ) : (
              <label className="w-full h-[500px] flex-jc-c border-dashed border-[2px] hover:border-black rounded-[12px] flex-col gap-4 cursor-pointer">
                <input type="file" className="hidden" onChange={selectImage} />
                <i className="fa-light fa-plus text-black/50 text-[50px]"></i>
                <h2 className="text-black/50">Выбрать картинку </h2>
              </label>
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

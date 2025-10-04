import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import {
  addToast,
  Button,
  DatePicker,
  DateValue,
  NumberInput,
  Select,
  SelectItem,
  SharedSelection,
  Switch,
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import { ActionGetProjectInfo } from "@/app/actions/admin/projects/get-project-info";
import { Spinner } from "@heroui/react";
import { ActionUpdateProjectInfo } from "@/app/actions/admin/projects/change-project-info";
import { ProjectDataPositions } from "@/utils/consts";
import { Input } from "@heroui/react";
import { ActionUpdateProjectInfoAllData } from "@/app/actions/admin/projects/change-project-info-all-data";
import moment from "moment";

interface IThisProps {
  status: boolean;
  onClose: () => void;
  project: IProjectStage;
}

type date = DateValue | null | undefined;

function ModalChangeProductItem({ status, onClose, project }: IThisProps) {
  const [projectData, setProjectData] = useState<IProjectData | null>(null);

  const [loadingChangeHide, setLoadingChangeHide] = useState(false);
  const [loadingSelectPosition, setLoadingSelectPosition] = useState(false);

  const [linkProject, setLinkProject] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number>(1000000);
  const [minCompletionDate, setCompletionDate] = useState<date>();

  useEffect(() => {
    ActionGetProjectInfo(project.id).then(({ data, status }) => {
      if (status) {
        const _Data = data as IProjectData;
        setProjectData(_Data);
        setLinkProject(_Data.page_url);
        setAddress(_Data.address);
        setMinPrice(_Data.min_price);
      }
    });
  }, []);

  function changeStatusHide(value: any) {
    if (projectData) {
      setLoadingChangeHide(true);
      ActionUpdateProjectInfo(projectData.id, "hide", value)
        .then(({ data }) => {
          setProjectData(data as IProjectData);
        })
        .finally(() => setLoadingChangeHide(false));
    }
  }

  function ChangePosition(e: SharedSelection) {
    if (projectData && e.currentKey) {
      setLoadingSelectPosition(true);
      ActionUpdateProjectInfo(projectData.id, "position", e.currentKey)
        .then(({ data }) => {
          setProjectData(data as IProjectData);
        })
        .finally(() => setLoadingSelectPosition(false));
    }
  }

  const [loading, setLoading] = useState(false);
  function saveInfo() {
    if (projectData) {
      setLoading(true);
      ActionUpdateProjectInfoAllData(projectData.id, {
        page_url: linkProject,
        address,
        min_price: minPrice,
        file_url: fileUrl,
        completion_date: moment(minCompletionDate),
      })
        .then((res) => {
          if (res.status) {
            addToast({
              title: "Информация успешно сохранена",
              color: "success",
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }

  return (
    <Modal size="lg" isOpen={status} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Изменить {project.title} ID: {project.id}
        </ModalHeader>
        <ModalBody>
          {projectData ? (
            <>
              <div className="mb-4">
                <Select
                  className="w-full"
                  label="Изменить статус"
                  onSelectionChange={ChangePosition}
                  selectedKeys={[`${projectData.position}`]}
                  isLoading={loadingSelectPosition}
                >
                  {ProjectDataPositions.map((status) => (
                    <SelectItem key={status.value}>{status.label}</SelectItem>
                  ))}
                </Select>
              </div>
              <div className="mb-4">
                <Input
                  label="Ссылка страницы "
                  placeholder="Напишите ссылку на страницу, на которую вы хотите быть перенаправлены."
                  value={linkProject}
                  onChange={(e) => setLinkProject(e.target.value)}
                  type="text"
                />
              </div>
              <div className="mb-4">
                <Input
                  label="Адрес проекта"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  type="text"
                />
              </div>
              <div className="mb-4">
                <NumberInput
                  className="w-full"
                  value={minPrice}
                  minLength={0}
                  onValueChange={(value) => setMinPrice(value)}
                  label="Цена от"
                  placeholder="Введите минимальную цену, с которой начнутся продажи."
                />
              </div>
              <div className="mb-4">
                <DatePicker
                  className="w-full"
                  value={minCompletionDate}
                  onChange={(value) => setCompletionDate(value)}
                  name="completion_date"
                  label="Срок сдачи"
                />
              </div>
              <div className="mb-4">
                <Input
                  label="Ссылка документа"
                  onChange={(e) => setFileUrl(e.target.value)}
                  type="text"
                />
              </div>

              <div>
                {loadingChangeHide ? (
                  <Spinner color="danger" />
                ) : (
                  <Switch
                    disabled={loadingChangeHide}
                    isSelected={projectData.hide}
                    onValueChange={changeStatusHide}
                  >
                    Скрыть
                  </Switch>
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-[300px] flex-jc-c">
              <Spinner color="danger" />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            className="text-white"
            onPress={saveInfo}
            isLoading={loading}
          >
            Сохранить
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ModalChangeProductItem;

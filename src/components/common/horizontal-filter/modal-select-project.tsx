import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  Select,
  SelectItem,
} from "@heroui/react";
import { ModalFooter } from "@heroui/modal";
import React from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { useSelector } from "react-redux";

interface IThisProps {
  status: boolean;
  onClose: () => void;
  projects: IProjectMerged[];
  onSelectProjects: (value: any) => void;
  onClearFilter: () => void;
}

function ModalSelectProject({
  status,
  onClose,
  projects,
  onSelectProjects,
  onClearFilter,
}: IThisProps) {
  const $t = useTranslate();

  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  return (
    <Modal isOpen={status} onOpenChange={onClose}>
      <ModalContent className="rounded-[12px_12px_0_0] w-full m-0">
        <ModalBody className="pt-6 overflow-y-auto">
          <div className="w-full">
            <h3 className="text-[12px] font-medium mb-1">
              {$t("residential_complex")}
            </h3>
            <Select
              placeholder="Выбрайте проект"
              selectedKeys={[`${filterParams?.projectId || 0}`]}
              className="w-full rounded-[8px] "
              color="primary"
              variant="flat"
              radius="sm"
              onSelectionChange={onSelectProjects}
            >
              {projects.map((projectName: IProjectMerged) => (
                <SelectItem key={`${projectName.project_id}`}>
                  {projectName.title}
                </SelectItem>
              ))}
            </Select>
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="w-full flex-jsb-c gap-4">
            <Button
              className="w-full rounded-[4px] bg-transparent text-blue"
              onPress={onClearFilter}
            >
              Сбросить все
            </Button>
            <Button
              color="primary"
              type="submit"
              className="bg-blue text-white w-full rounded-[4px]"
              onPress={onClose}
            >
              Применить
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ModalSelectProject;

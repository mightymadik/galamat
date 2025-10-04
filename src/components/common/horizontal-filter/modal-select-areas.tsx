import { Button, Modal, ModalBody, ModalContent } from "@heroui/react";
import { ModalFooter } from "@heroui/modal";
import React from "react";
import clsx from "clsx";
import { useSelector } from "react-redux";

interface IThisProps {
  status: boolean;
  onClose: () => void;
  onClearFilter: () => void;
  toggleNumber: (value: number) => void;
}

function ModalSelectAreas({
  status,
  onClose,
  onClearFilter,
  toggleNumber,
}: IThisProps) {
  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  return (
    <Modal isOpen={status} onOpenChange={onClose}>
      <ModalContent className="rounded-[12px_12px_0_0] w-full m-0">
        <ModalBody className="pt-6 overflow-y-auto">
          <div className="w-full flex-js-s gap-2 flex-col">
            <h3 className="text-[12px] font-medium">Комнатность</h3>
            <div className="flex-js-c gap-1">
              {Array.from({ length: 4 }).map((room, index) => (
                <span
                  key={`rooms-${index}`}
                  className={clsx(
                    "w-[40px] h-[34px] border-[2px] border-black/10 !rounded-[4px] text-[14px] flex-jc-c text-black/70",
                    {
                      "!bg-blue !text-white": filterParams?.rooms?.includes(
                        index + 1,
                      ),
                    },
                  )}
                  onClick={() => toggleNumber(index + 1)}
                >
                  {index + 1}
                  {index + 1 === 4 ? "+" : ""}
                </span>
              ))}
            </div>
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

export default ModalSelectAreas;

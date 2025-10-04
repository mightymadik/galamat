import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  NumberInput,
} from "@heroui/react";
import { ModalFooter } from "@heroui/modal";
import React from "react";

interface IThisProps {
  status: boolean;
  onClose: () => void;
  onClearFilter: () => void;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}

function ModalSelectPlace({
  status,
  onClose,
  onClearFilter,
  onChangeMin,
  onChangeMax,
}: IThisProps) {
  return (
    <Modal isOpen={status} onOpenChange={onClose}>
      <ModalContent className="rounded-[12px_12px_0_0] w-full m-0">
        <ModalBody className="py-6">
          <div className="w-full flex-js-s gap-2 flex-col">
            <h3 className="text-[12px] font-medium">Площадь М²</h3>

            <div className="w-full grid grid-cols-2 gap-2">
              <label>
                <span className="text-[12px] text-[#9D9D9D] mb-1 block">
                  От
                </span>
                <NumberInput
                  size="sm"
                  className="h-[30px]"
                  variant="bordered"
                  minValue={10}
                  defaultValue={10}
                  onValueChange={onChangeMin}
                  endContent="м²"
                />
              </label>
              <label>
                <span className="text-[12px] text-[#9D9D9D] mb-1 block">
                  До
                </span>
                <NumberInput
                  size="sm"
                  className="h-[30px]"
                  variant="bordered"
                  onValueChange={onChangeMax}
                  endContent="м²"
                />
              </label>
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

export default ModalSelectPlace;

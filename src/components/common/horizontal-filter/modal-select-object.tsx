import {
  Button,
  Divider,
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
import { motion } from "framer-motion";

interface IThisProps {
  status: boolean;
  onClose: () => void;
  houses: IHouse[] | null;
  onSelectHouses: (value: any) => void;
  onClearFilter: () => void;
}

function ModalSelectObject({
  status,
  onClose,
  houses,
  onSelectHouses,
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
          {houses ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
              >
                <h3 className="text-[12px] font-medium mb-1">
                  {$t("residential_complex")}
                </h3>
                <Select
                  placeholder="Выбрайте объекты"
                  selectedKeys={[`${filterParams?.houseId || 0}`]}
                  className="w-full rounded-[8px]"
                  color="primary"
                  variant="flat"
                  radius="sm"
                  onSelectionChange={onSelectHouses}
                >
                  {houses.map((house: IHouse) => (
                    <SelectItem key={`${house.id}`}>{house.title}</SelectItem>
                  ))}
                </Select>
              </motion.div>

              <Divider />
            </>
          ) : (
            <h4 className="w-full text-center opacity-65 text-[14px] mb-10">
              Сначала выберите проект
            </h4>
          )}
        </ModalBody>
        {houses ? (
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
        ) : null}
      </ModalContent>
    </Modal>
  );
}

export default ModalSelectObject;

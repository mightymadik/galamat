import { Divider, Drawer, DrawerBody, DrawerContent } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { formatKzt, getClosestPlansByPrice, RandomKey } from "@/utils/helpers";
import Link from "next/link";
import PrintPlanItem from "@/app/real-estate/print-plan-item";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";

interface IThisProps {
  status: boolean;
  plan: IPlan;
  plans: IPlan[];
  onClose: () => void;
}

function DiwiderViewPlanInfo({ status, plan, plans, onClose }: IThisProps) {
  const [selectedPlan, setSelectedPlan] = useState<IPlan>(plan);

  const [recommended, setRecommended] = useState<IPlan[]>([]);

  useEffect(() => {
    if (status) {
      const getRecommendedHouses = getClosestPlansByPrice(
        plans,
        +plan.priceRange.min,
        plan.houseId,
      );

      setRecommended(getRecommendedHouses);
    }
  }, [status]);

  const [areas, setAreas] = useState<IProperty[] | null>(null);

  useEffect(() => {
    if (status) {
      const requests = recommended.flatMap((area) =>
        area.properties.map((id) =>
          ActionGetProjectsProperty("/property", { id }),
        ),
      );

      Promise.all(requests)
        .then((responses) => {
          const getAreaData = responses
            .map((r) => r?.data?.[0])
            .filter(Boolean);
          setAreas(getAreaData);
        })
        .catch((err) => {
          console.error("Property fetch failed:", err);
        });
    }
  }, [selectedPlan, recommended]);

  return (
    <Drawer isOpen={status} onOpenChange={onClose} radius="none" size="4xl">
      <DrawerContent>
        <DrawerBody>
          <div className="w-full min-h-[500px]">
            <Link href={selectedPlan.image.big} target="_blank">
              <img
                src={selectedPlan.image.big}
                alt={selectedPlan.projectName}
                className="w-full mt-8"
              />
            </Link>
          </div>

          <Divider className="my-4" />

          <div>
            <h2 className="text-[30px]">
              {formatKzt(+selectedPlan.priceRange.min)}
            </h2>
            <h1 className="font-bold text-[25px]">{selectedPlan.houseName}</h1>
          </div>
          <ul>
            <li className="mb-2">
              <span className="text-black/60">Количество комнат:</span>{" "}
              {selectedPlan.roomsAmount}
            </li>
            <li className="mb-2">
              <span className="text-black/60">Цена за м²:</span>{" "}
              {formatKzt(+plan.priceRange.min / +selectedPlan.areaRange.min)}
            </li>
            <li className="mb-2">
              <span className="text-black/60">Помещения:</span>{" "}
              {selectedPlan.areaRange.min} м²
            </li>
          </ul>

          <div className="text-end font-medium">Мы также предлагаем</div>
          <div className="mb-6">
            {recommended.map((_plan) => (
              <PrintPlanItem
                key={RandomKey()}
                _plan={_plan}
                OpenPlanMaxView={(plan: IPlan) => setSelectedPlan(plan)}
                areas={areas}
              />
            ))}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export default DiwiderViewPlanInfo;

"use client";

import { SITE_URL } from "@/utils/consts";
import AdminMainTemplate from "@/components/layout/admin/admin-main-template";
import React, { useEffect, useState } from "react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { Spinner } from "@heroui/react";
import { useParams } from "next/navigation";
import HouseItem from "@/app/admin/projects/houses/[id]/house-item";

function Houses() {
  const { id } = useParams();

  const [houses, setHouses] = useState<IHouse[] | null>(null);

  useEffect(() => {
    if (id) {
      ActionGetProjectsProperty("/house", {
        isArchive: false,
        status: ["AVAILABLE"],
        projectId: id,
      }).then((result) => {
        setHouses(result.data);
      });
    }
  }, []);

  return (
    <AdminMainTemplate pathname={`/${SITE_URL.ADMIN_PROJECTS_HOUSES}`}>
      {houses ? (
        <div className="w-full h-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {houses.map((house: IHouse) => (
            <HouseItem key={`house-${house.id}`} house={house} />
          ))}
        </div>
      ) : (
        <div className="w-full h-[300px] flex-jc-c">
          <Spinner />
        </div>
      )}
    </AdminMainTemplate>
  );
}

export default Houses;

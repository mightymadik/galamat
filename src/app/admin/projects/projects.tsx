"use client";

import { SITE_URL } from "@/utils/consts";
import AdminMainTemplate from "@/components/layout/admin/admin-main-template";
import React, { useState, useMemo } from "react";
import ProductItemAdmin from "@/app/admin/projects/product-item-admin";
import { Pagination } from "@heroui/react";

interface IThisProps {
  houses: IProjectStage[];
  housesDataAdmin: IProjectData[];
}

const ITEMS_PER_PAGE = 6;

function Projects({ houses, housesDataAdmin }: IThisProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(houses.length / ITEMS_PER_PAGE);

  const currentHouses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return houses.slice(start, end);
  }, [houses, currentPage]);

  return (
    <AdminMainTemplate pathname={`/${SITE_URL.ADMIN_PROJECTS}`}>
      <div className="w-full h-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentHouses.map((house: IProjectStage) => (
          <ProductItemAdmin
            key={`admin-house-${house.id}`}
            project={house}
            housesDataAdmin={housesDataAdmin}
          />
        ))}
      </div>

      <div className="w-full flex-jc-c mt-10 mb-10">
        <Pagination
          initialPage={currentPage}
          total={totalPages}
          onChange={setCurrentPage}
        />
      </div>
    </AdminMainTemplate>
  );
}

export default Projects;

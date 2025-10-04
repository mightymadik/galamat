"use client";

import React from "react";
import AdminMainTemplate from "@/components/layout/admin/admin-main-template";
import { SITE_URL } from "@/utils/consts";
import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import Probabilities from "@/app/admin/lottery/probabilities";
import Players from "@/app/admin/lottery/players";

function Lottery() {
  return (
    <AdminMainTemplate pathname={`/${SITE_URL.ADMIN_LOTTERY}`}>
      <Tabs aria-label="Options">
        <Tab key="probabilities" title="Вероятности">
          <Card>
            <CardBody className="p-0">
              <Probabilities />
            </CardBody>
          </Card>
        </Tab>
        <Tab key="players" title="Список игроков">
          <Card>
            <CardBody>
              <Players />
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </AdminMainTemplate>
  );
}

export default Lottery;

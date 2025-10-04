import React from "react";
import AdminMainTemplate from "@/components/layout/admin/admin-main-template";
import { SITE_URL } from "@/utils/consts";

function Requests() {
  return (
    <AdminMainTemplate pathname={`/${SITE_URL.ADMIN}`}>
      <h1>Hello</h1>
    </AdminMainTemplate>
  );
}

export default Requests;

"use server";

import React from "react";
import "@/components/layout/orleu-project/style.scss";
import OrleuProject from "@/app/orleu-project/orleu-project";

export async function generateMetadata() {
  return {
    title: "Orleu - квартиры в Алматинском районе",
  };
}

async function Page() {
  return <OrleuProject />;
}

export default Page;

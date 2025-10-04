import MainTemplate from "@/components/common/main-template/main-template";
import React from "react";

export async function generateMetadata() {
  return {
    title: "Galamat faq",
  };
}

function Requests() {
  return <MainTemplate pageOff />;
}

export default Requests;

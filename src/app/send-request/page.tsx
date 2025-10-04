import React from "react";
import SendRequest from "@/app/send-request/send-request";

export async function generateMetadata() {
  return {
    title: "Оставить заявку квартиру",
  };
}

function Requests() {
  return <SendRequest />;
}

export default Requests;

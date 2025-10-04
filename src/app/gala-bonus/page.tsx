"use server";

import "./gala-bonus.scss";
import React from "react";
import GalaBonus from "@/app/gala-bonus/gala-bonus";

export async function generateMetadata() {
  return {
    title: "Gala Bonus | Galamat",
  };
}

function Requests() {
  return <GalaBonus />;
}

export default Requests;

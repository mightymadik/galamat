"use server";

import OurCompany from "@/app/our-company/our-company";

export async function generateMetadata() {
  return {
    title: "Почему мы?",
  };
}

async function Requests() {
  return <OurCompany />;
}

export default Requests;

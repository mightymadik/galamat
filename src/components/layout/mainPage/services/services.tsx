"use server"

import ServicesClient from "./serviceClient";
import { fetchServiceData } from "./serviceServer"

export default async function Service() {
  const serviceData = await fetchServiceData();

  return <ServicesClient serviceData={serviceData || []} />;
}
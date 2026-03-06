import ExpectApartmentsClient from "./expectApartmentsClient";
import { fetchExpectApartments } from "./expectApartmentsServer";

export default async function ExpectApartments() {
  const data = await fetchExpectApartments();
  return <ExpectApartmentsClient data={data} />;
}
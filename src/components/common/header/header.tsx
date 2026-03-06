import { getHeader } from "@/app/api/header/getHeader";
import HeaderClient from "./headerClient";

export default async function Header() {
  const data = await getHeader();
  if (!data) return null;

  return <HeaderClient data={data} />;
}

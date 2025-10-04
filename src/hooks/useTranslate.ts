import { useSelector } from "react-redux";

export function useTranslate() {
  const words = useSelector(
    (state: IStateTranslate) => state.translateSite.words,
  );

  return (key: string): string => {
    return words?.[key] || key; // fallback → key
  };
}

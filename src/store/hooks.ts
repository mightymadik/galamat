import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "./index";
import type { RootState } from "./index";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <TSelected = unknown>(
  selector: (state: RootState) => TSelected
): TSelected => useSelector<RootState, TSelected>(selector);
import { ProjectDataPositions } from "@/utils/consts";
import clsx from "clsx";

interface IThisProps {
  position: (typeof ProjectDataPositions)[number]["value"];
  className?: string;
}

function PrintStatus({ position, className }: IThisProps) {
  const findColor = ProjectDataPositions.find(
    (_pos) => _pos.value === position,
  );

  return (
    <span
      className={clsx("style", className)}
      style={{ backgroundColor: findColor?.color }}
    >
      {findColor?.label}
    </span>
  );
}

export default PrintStatus;

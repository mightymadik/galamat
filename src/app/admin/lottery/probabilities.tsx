import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { ActionGetProbabilities } from "@/app/actions/lottery/get-probabilities";
import { useEffect, useState } from "react";
import { addToast, NumberInput } from "@heroui/react";
import { ActionUpdateProbabilities } from "@/app/actions/lottery/update-probabilities";

function Probabilities() {
  const [probabilities, setProbabilities] = useState<IProbabilities[]>([]);

  const allResult = probabilities.reduce(
    (acc, current) => acc + current.probability,
    0,
  );

  useEffect(updateProbabilities, []);

  function updateProbabilities() {
    ActionGetProbabilities().then((probabilities) => {
      setProbabilities(probabilities.data);
    });
  }

  function changeProbabilities(id: number, key: string, value: number) {
    ActionUpdateProbabilities(id, key, value).then(() => {
      addToast({
        title: "Успешно обновлено",
        color: "success",
      });
      updateProbabilities();
    });
  }

  return (
    <div>
      {allResult > 100 ? (
        <div className="p-4">
          <h3 className="text-red-600 underline text-[20px]">
            Здесь есть грубые ошибка, общая сумма вероятностей не должна
            превышать 100.
          </h3>
        </div>
      ) : null}

      <Table aria-label="Example static collection table" shadow="none">
        <TableHeader>
          <TableColumn>ЦЕНА</TableColumn>
          <TableColumn>ВЕРОЯТНОСТИ</TableColumn>
        </TableHeader>
        <TableBody>
          {probabilities.map((probabilities: IProbabilities) => (
            <TableRow key={`prob-${probabilities.id}`}>
              <TableCell>
                <NumberInput
                  type="text"
                  defaultValue={probabilities.price}
                  endContent={<span className="opacity-50">k</span>}
                  onValueChange={(value) =>
                    changeProbabilities(probabilities.id, "price", value)
                  }
                />
              </TableCell>
              <TableCell>
                <NumberInput
                  type="text"
                  defaultValue={probabilities.probability}
                  endContent={<span className="opacity-50">%</span>}
                  onValueChange={(value) =>
                    changeProbabilities(probabilities.id, "probability", value)
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default Probabilities;

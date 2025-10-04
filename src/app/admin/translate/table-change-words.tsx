import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import { GetLanguage } from "@/app/actions/admin/language/get-languages";
import { Spinner } from "@heroui/react";
import ChangeKey from "@/app/admin/translate/change-key";

interface IThisProps {
  selectedLanguage: ILanguage[];
  selectedParent: string;
}

function TableChangeWords({ selectedLanguage, selectedParent }: IThisProps) {
  const [mergedLanguage, setMergedLanguage] = useState<ILangMerged[]>([]);

  useEffect(() => {
    GetLanguage("ru").then(({ data }: { data: ILanguage[] }) => {
      const startConvert: any = [...data]
        .map((lang) => {
          const fontKey = selectedLanguage.find((_lg) => _lg.key === lang.key);
          return {
            id: fontKey?.id,
            ruName: lang.name,
            name: fontKey?.name || "",
            parent_id: fontKey?.parent_id,
          };
        })
        .reverse();
      setMergedLanguage(startConvert);
    });
  }, [selectedParent]);

  return (
    <>
      {mergedLanguage.length ? (
        <Table
          aria-label="Table Languages"
          className="mt-10"
          selectionMode="single"
        >
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>RU Name</TableColumn>
            <TableColumn>Name</TableColumn>
          </TableHeader>
          <TableBody>
            {mergedLanguage.map((_lang) => (
              <TableRow key={`lang-${_lang.id}`}>
                <TableCell>{_lang.id}</TableCell>
                <TableCell>{_lang.ruName}</TableCell>
                <TableCell className="w-1/2">
                  <ChangeKey _lang={_lang} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="w-full h-[400px] flex-jc-c">
          <Spinner color="danger" />
        </div>
      )}
    </>
  );
}

export default TableChangeWords;

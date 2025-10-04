"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { useEffect, useState } from "react";
import { ActionGetPlayers } from "@/app/actions/lottery/get-players";
import moment from "moment";
import { Button } from "@heroui/react";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function Players() {
  const [players, setPlayers] = useState<IPlayer[]>([]);

  useEffect(() => {
    ActionGetPlayers().then((res) => {
      setPlayers(res.data as IPlayer[]);
    });
  }, []);

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(players);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Players");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileData = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(fileData, "Players_Galamat.xlsx");
  };

  return (
    <div>
      <div className="flex-je-c mb-4 pr-4 mt-2">
        <Button size="sm" onPress={handleExport}>
          Скачать XLSX
        </Button>
      </div>

      <Table aria-label="Example static collection table" shadow="none">
        <TableHeader>
          <TableColumn>ID</TableColumn>
          <TableColumn>СТАТУС</TableColumn>
          <TableColumn>НОМЕР ТЕЛЕФОНА</TableColumn>
          <TableColumn>КОД ВЕРИФИКАЦИИ</TableColumn>
          <TableColumn>ДЕНЬ ИГРА</TableColumn>
          <TableColumn>НАМИНАЛА_ВЫИГРЫША</TableColumn>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={`prob-${player.id}`}>
              <TableCell>{player.id}</TableCell>
              <TableCell>{player.status}</TableCell>
              <TableCell>{player.phone}</TableCell>
              <TableCell>{player.verification_code}</TableCell>
              <TableCell>
                {moment(player.timeout).format("DD.MM.YYYY mm:hh")}
              </TableCell>
              <TableCell>{player.winner}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default Players;

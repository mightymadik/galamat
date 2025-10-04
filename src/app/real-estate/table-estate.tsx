import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Select,
  SelectItem,
} from "@heroui/react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { Spinner } from "@heroui/react";
import StatusTable from "@/app/real-estate/status-table";
import { useSelector } from "react-redux";

interface IThisProps {
  projectsIds: number[];
}

function TableEstate({ projectsIds }: IThisProps) {
  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [property, setProperty] = useState<IProperty[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const pages = Math.ceil(property.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return property.slice(start, end);
  }, [page, property, rowsPerPage]);

  useEffect(() => {
    setLoading(true);

    const _filterParams: any = { ...filterParams };

    if (!_filterParams.projectId) {
      delete _filterParams["projectId"];
    }

    if (!_filterParams.houseId) {
      delete _filterParams["houseId"];
    } else {
      _filterParams.houseId = [filterParams.houseId];
    }

    ActionGetProjectsProperty("/property", {
      isArchive: false,
      status: ["AVAILABLE"],
      projectIds: projectsIds,
      ..._filterParams,
    })
      .then((result) => {
        const data: IProperty[] = result.data;
        setProperty(data);
      })
      .finally(() => setLoading(false));
  }, [filterParams]);

  return (
    <Table
      aria-label="plan table"
      shadow="none"
      isHeaderSticky
      isStriped
      selectionMode="single"
      radius="sm"
      bottomContent={
        <div className="w-full flex-je-c gap-4 mt-6">
          <Select
            className="w-[80px]"
            selectedKeys={[`${rowsPerPage}`]}
            onSelectionChange={(e) =>
              setRowsPerPage(e.currentKey ? +e.currentKey : 10)
            }
            radius="sm"
          >
            <SelectItem key="10">10</SelectItem>
            <SelectItem key="20">20</SelectItem>
            <SelectItem key="40">40</SelectItem>
            <SelectItem key="75">75</SelectItem>
          </Select>
          <Pagination
            isCompact
            showControls
            showShadow
            color="secondary"
            page={page}
            total={pages}
            onChange={(page) => setPage(page)}
            classNames={{
              cursor: "bg-blue shadow-none",
            }}
            radius="sm"
          />
        </div>
      }
      classNames={{
        wrapper: "min-h-[222px]",
        tr: "h-[50px]",
      }}
    >
      <TableHeader>
        <TableColumn key="type">Тип</TableColumn>
        <TableColumn key="status">Статус</TableColumn>
        <TableColumn key="count-rooms">Кол-во комнат</TableColumn>
        <TableColumn key="name-project">Название ЖК</TableColumn>
        <TableColumn key="number-place">Номер помещения</TableColumn>
        <TableColumn key="count-place">Площадь, м²</TableColumn>
        <TableColumn key="entrance">Подъезд</TableColumn>
        {/*<TableColumn key="price">Цена</TableColumn>*/}
        <TableColumn key="floor">Этаж</TableColumn>
      </TableHeader>
      <TableBody
        loadingContent={<Spinner />}
        loadingState={loading ? "loading" : "idle"}
      >
        {items.map((plan) => (
          <TableRow key={`pln__${plan.id}`}>
            <TableCell>
              {plan.typePurpose === "residential" ? "Квартира" : ""}
            </TableCell>
            <TableCell>
              <StatusTable status={plan.status} />
            </TableCell>
            <TableCell>{plan.rooms_amount}</TableCell>
            <TableCell>{plan.projectName}</TableCell>
            <TableCell>{plan.number}</TableCell>
            <TableCell>{plan.area.area_total} м²</TableCell>
            <TableCell>{plan.sectionName}</TableCell>
            {/*<TableCell>{formatKzt(plan.price.value)}</TableCell>*/}
            <TableCell>{plan.floor}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default TableEstate;

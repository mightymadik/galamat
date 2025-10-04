"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminMainTemplate from "@/components/layout/admin/admin-main-template";
import { SITE_URL } from "@/utils/consts";
import {
  addToast,
  Button,
  getKeyValue,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
} from "@heroui/react";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { Input } from "@heroui/react";
import { CreateUser } from "@/app/actions/admin/users/create-user";
import { GetUsers } from "@/app/actions/admin/users/get-users";
import { Spinner } from "@heroui/react";
import MenuTableUser from "@/app/admin/users/menu-table-user";
import { RemoveUser } from "@/app/actions/admin/users/remove-users";

function Users() {
  const [modalNewUser, setModalNewUser] = useState(false);
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<IUserNoPass[]>([]);
  const [loadingUserTable, setLoadingUserTable] = useState<boolean>(true);

  useEffect(GetUsersList, []);

  function GetUsersList() {
    setLoadingUserTable(true);
    GetUsers().then((res) => {
      if (res.status) {
        setUsers(res.data);
        setLoadingUserTable(false);
      }
    });
  }

  function StartCreateUser(e: any) {
    e.preventDefault();

    const name = e.target.name.value;
    const username = e.target.username.value;
    const password = e.target.password.value;

    if (name && username && password) {
      setLoading(true);
      CreateUser(name, username, password, "super-admin")
        .then((res) => {
          if (res.status) {
            addToast({
              title: "Пользователь успешно добавлен",
              color: "success",
            });
            setModalNewUser(false);
            GetUsersList();
          }
        })
        .finally(() => setLoading(false));
    } else {
      addToast({
        title: "Поля обязательны для заполнения.",
        color: "danger",
      });
    }
  }

  const [page, setPage] = useState(1);
  const rowsPerPage = 6;

  const pages = Math.ceil(users.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return users.slice(start, end);
  }, [page, users]);

  function _RemoveUser(id: number) {
    RemoveUser(id).then((res) => {
      if (res.status) {
        GetUsersList();
        addToast({
          title: "Пользователь успешно удален.",
          color: "success",
        });
      }
    });
  }

  return (
    <AdminMainTemplate pathname={`/${SITE_URL.ADMIN_USERS}`}>
      <div className="flex-je-c mt-6 mb-4">
        <Tooltip content="Создать нового пользователя">
          <Button
            variant="flat"
            color="primary"
            className="px-0 w-8 h-8"
            onPress={() => setModalNewUser(true)}
          >
            <i className="fa-solid fa-plus"></i>
          </Button>
        </Tooltip>
      </div>

      <Table
        aria-label="USers table"
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              showShadow
              color="secondary"
              page={page}
              total={pages}
              onChange={(page) => setPage(page)}
            />
          </div>
        }
        classNames={{
          wrapper: "min-h-[222px]",
        }}
      >
        <TableHeader>
          <TableColumn key="id">ID</TableColumn>
          <TableColumn key="name">NAME</TableColumn>
          <TableColumn key="login">USERNAME</TableColumn>
          <TableColumn key="status">STATUS</TableColumn>
          <TableColumn key="actions" width={50}>
            {" "}
          </TableColumn>
        </TableHeader>
        <TableBody
          items={items}
          isLoading={loadingUserTable}
          loadingContent={<Spinner label="Loading..." />}
          emptyContent={"No users found"}
        >
          {(item) => (
            <TableRow key={item.name}>
              {(columnKey) =>
                columnKey === "actions" ? (
                  <TableCell className="flex-je-c">
                    <MenuTableUser onDelete={() => _RemoveUser(item.id)} />
                  </TableCell>
                ) : (
                  <TableCell>{getKeyValue(item, columnKey)}</TableCell>
                )
              }
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog
        open={modalNewUser}
        onClose={() => setModalNewUser(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
      >
        <DialogTitle>Создание новых пользователей</DialogTitle>
        <DialogContent className="w-[500px]">
          <form
            onSubmit={StartCreateUser}
            action="#"
            className="w-full flex-jc-c flex-col gap-4"
          >
            <Input
              className="max-full"
              label="Имя"
              type="text"
              name="name"
              required
              variant="bordered"
            />
            <Input
              className="max-full"
              label="Имя пользователя"
              type="text"
              name="username"
              required
              variant="bordered"
            />
            <Input
              className="max-full"
              label="Пароль"
              type="password"
              name="password"
              required
              variant="bordered"
            />
            <Button variant="flat" type="submit" isLoading={loading}>
              Добавить
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminMainTemplate>
  );
}

export default Users;

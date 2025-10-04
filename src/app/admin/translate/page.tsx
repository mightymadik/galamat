"use client";

import React, { useEffect, useState } from "react";
import AdminMainTemplate from "@/components/layout/admin/admin-main-template";
import { SITE_URL } from "@/utils/consts";
import {
  addToast,
  Button,
  Select,
  SelectItem,
  Snippet,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { Input } from "@heroui/react";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { GetLanguage } from "@/app/actions/admin/language/get-languages";
import { CreateParentLanguage } from "@/app/actions/admin/language/create-parent-language";
import { DeleteLanguage } from "@/app/actions/admin/language/remove-language";
import { CreateLanguage } from "@/app/actions/admin/language/create-language";
import TableChangeWords from "@/app/admin/translate/table-change-words";
import { Spinner } from "@heroui/react";

function Requests() {
  const [modalCreateNewLanguage, setModalCreateNewLanguage] = useState(false);
  const [loadingCreateNewLanguage, setLoadingCreateNewLanguage] =
    useState(false);

  const [parrentLoading, setParrentLoading] = useState<boolean>(true);
  const [parents, setParents] = useState<ILanguage[]>([]);
  const [selectedParantLang, setSelectedParantLang] = useState<string>(
    parents[0]?.key || "ru",
  );

  const [modalCreateNewKey, setModalCreateNewKey] = useState<boolean>(false);

  const [keyInput, setKeyInput] = useState<string>("");
  useEffect(() => {
    UpdateParentLanguages();
  }, []);

  const [getSelectedLanguage, setSelectedLanguage] = useState<ILanguage[]>([]);

  useEffect(() => {
    if (selectedParantLang) {
      _getLanguages();
      setSelectedLanguage([]);
    }
  }, [selectedParantLang]);

  function _getLanguages() {
    GetLanguage(selectedParantLang).then(({ data }) => {
      setSelectedLanguage(data.reverse());
    });
  }

  function UpdateParentLanguages() {
    setParrentLoading(true);

    GetLanguage("parents").then(({ data }) => {
      setParents(data);
      setParrentLoading(false);
    });
  }

  function CParentLanguage(e: any) {
    e.preventDefault();
    const name = e.target.name.value;
    if (name) {
      setLoadingCreateNewLanguage(true);
      CreateParentLanguage(name)
        .then((res) => {
          if (res.status) {
            addToast({
              title: "Язык успешно добавлен",
              color: "success",
            });
            UpdateParentLanguages();
            setModalCreateNewLanguage(false);
          }
        })
        .finally(() => setLoadingCreateNewLanguage(false));
    } else {
      addToast({
        title: "Поле «Называние» обязательно для заполнения.",
        color: "danger",
      });
    }
  }

  const [loadingDeleting, setLoadingDeleting] = useState(false);

  function RemoveLanguage() {
    if (selectedParantLang) {
      setLoadingDeleting(true);
      DeleteLanguage(selectedParantLang)
        .then(() => {
          UpdateParentLanguages();
          addToast({
            title: "Язык успешно удален",
            color: "success",
          });
        })
        .finally(() => setLoadingDeleting(false));
    }
  }

  const [loadingCreateKey, setLoadingCreateKey] = useState<boolean>(false);
  function CreateNewKey(e: any) {
    e.preventDefault();

    const name = e.target.name.value;
    const key = e.target.key.value;

    if (name && key && selectedParantLang) {
      setLoadingCreateKey(true);
      CreateLanguage(name, key, selectedParantLang)
        .then(() => {
          _getLanguages();
          setModalCreateNewKey(false);
          setKeyInput("");
        })
        .finally(() => setLoadingCreateKey(false));
    }
  }

  function ChangeKeyInput(e: any) {
    const value = e.target.value;
    const formattedText = value.toLowerCase().replace(/\s+/g, "_");
    setKeyInput(formattedText);
  }

  return (
    <AdminMainTemplate pathname={`/${SITE_URL.ADMIN_TRANSLATE}`}>
      {parrentLoading ? (
        <div className="w-full h-[400px] flex-jc-c">
          <Spinner color="danger" />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <div className="flex-js-s gap-4 flex-col w-[400px]">
              <Select
                className="w-full"
                label="Выберите язык"
                selectedKeys={[`${selectedParantLang}`]}
                onSelectionChange={(key) =>
                  setSelectedParantLang(key.currentKey ? key.currentKey : "ru")
                }
              >
                {parents.map((_lang) => (
                  <SelectItem key={_lang.key}>{_lang.name}</SelectItem>
                ))}
              </Select>
              <div className="w-full flex-jsb-c gap-4">
                <Button
                  variant="flat"
                  onPress={() => setModalCreateNewLanguage(true)}
                >
                  Добавить язык
                  <i className="fa-solid fa-plus ml-2"></i>
                </Button>
                {selectedParantLang ? (
                  <Button
                    variant="flat"
                    color="danger"
                    isLoading={loadingDeleting}
                    onPress={RemoveLanguage}
                  >
                    Удалить
                    <i className="fa-solid fa-trash ml-2"></i>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {selectedParantLang === "ru" ? (
            <div className="flex-je-c mt-6">
              <Button
                variant="flat"
                color="primary"
                className="px-0 w-8 h-8"
                onPress={() => setModalCreateNewKey(true)}
              >
                <i className="fa-solid fa-plus"></i>
              </Button>
            </div>
          ) : null}
          {getSelectedLanguage.length ? (
            <>
              {selectedParantLang === "ru" ? (
                <Table
                  aria-label="Table Languages"
                  className="mt-4"
                  selectionMode="single"
                >
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Key</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {getSelectedLanguage.map((_lang) => (
                      <TableRow key={`lang-${_lang.key}`}>
                        <TableCell>{_lang.id}</TableCell>
                        <TableCell>{_lang.name}</TableCell>
                        <TableCell>
                          <Snippet className="h-[30px]" symbol="">
                            {_lang.key}
                          </Snippet>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <TableChangeWords
                  selectedLanguage={getSelectedLanguage}
                  selectedParent={selectedParantLang}
                />
              )}
            </>
          ) : null}
        </>
      )}

      <Dialog
        open={modalCreateNewKey}
        onClose={() => setModalCreateNewKey(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
      >
        <DialogTitle>Добавить новое слово для перевода</DialogTitle>
        <DialogContent className="w-[500px]">
          <form
            action="#"
            onSubmit={CreateNewKey}
            className="w-full flex-jc-c flex-col gap-4"
          >
            <Input
              className="max-full"
              placeholder="Проекты Galamat"
              label="Называние"
              type="text"
              name="name"
              required
              variant="bordered"
            />
            <Input
              className="max-full"
              placeholder="project_galamat"
              label="Key"
              type="text"
              value={keyInput}
              onChange={ChangeKeyInput}
              name="key"
              required
              variant="bordered"
            />
            <Button variant="flat" type="submit" isLoading={loadingCreateKey}>
              Добавить
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalCreateNewLanguage}
        onClose={() => setModalCreateNewLanguage(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle>Добавить новый язык на сайт</DialogTitle>
        <DialogContent>
          <form
            action=""
            onSubmit={CParentLanguage}
            className="w-full flex-jc-c flex-col gap-4"
          >
            <Input
              className="max-full"
              placeholder="RU | EN | FR ..."
              label="Называние"
              type="text"
              name="name"
              required
              variant="bordered"
            />
            <Button
              variant="flat"
              type="submit"
              isLoading={loadingCreateNewLanguage}
            >
              Добавить
              <i className="fa-solid fa-plus ml-2"></i>
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminMainTemplate>
  );
}

export default Requests;

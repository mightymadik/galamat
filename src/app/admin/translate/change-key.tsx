import { Input } from "@heroui/react";
import React, { useState } from "react";
import { addToast, Button } from "@heroui/react";
import { UpdateLanguage } from "@/app/actions/admin/language/change-language";
import clsx from "clsx";

interface IThisProps {
  _lang: ILangMerged;
}

function ChangeKey({ _lang }: IThisProps) {
  const [loading, setLoading] = useState<boolean>(false);

  function SaveChanges(e: any) {
    e.preventDefault();

    const key = e.target.key.value;

    if (key && _lang.id) {
      setLoading(true);
      UpdateLanguage(_lang.id, key)
        .then(() => {
          addToast({
            title: "Успешно обновлено",
            color: "success",
          });
        })
        .finally(() => setLoading(false));
    } else {
      addToast({
        title: "Поле «Key» обязательно для заполнения.",
        color: "danger",
      });
    }
  }

  return (
    <form onSubmit={SaveChanges} action="#" className="w-full relative">
      <Input type="text" defaultValue={_lang.name} name="key" required />
      <Button
        type="submit"
        isLoading={loading}
        className={clsx(
          "absolute top-[50%] right-1 transform translate-y-[-50%] cursor-pointer w-[30px] h-[30px] flex-jc-c",
          {
            "fa-solid fa-check": !loading,
          },
        )}
      />
    </form>
  );
}

export default ChangeKey;

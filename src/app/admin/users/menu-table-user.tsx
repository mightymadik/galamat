import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";

interface IThisProps {
  onDelete: () => void;
}

function MenuTableUser({ onDelete }: IThisProps) {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="bordered" isIconOnly>
          <i className="fa-solid fa-ellipsis-vertical text-[20px] text-black/70"></i>
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions">
        <DropdownItem key="new">Изменить</DropdownItem>
        <DropdownItem
          key="delete"
          className="text-danger"
          color="danger"
          onPress={onDelete}
        >
          Удалить
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

export default MenuTableUser;

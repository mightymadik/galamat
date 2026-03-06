import React from "react";

interface RoomSelectorProps {
  label: string;
  rooms: string[];
  selectedRooms: Set<string>;
  setSelectedRooms: (rooms: Set<string>) => void;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({
  label,
  rooms,
  selectedRooms,
  setSelectedRooms,
}) => {
  const toggleRoom = (room: string) => {
    const newSelected = new Set(selectedRooms);
    if (newSelected.has(room)) {
      newSelected.delete(room);
    } else {
      newSelected.add(room);
    }
    setSelectedRooms(newSelected);
  };

  return (
    <div className="mainPageFilterRadio flex flex-col items-start gap-1 w-full">
      <p className="flex self-stretch overflow-hidden text-xs not-italic font-normal">{label}</p>
      <div className="mainPageFilterRadioInner flex items-start self-stretch gap-2">
        {rooms.map((room) => (
          <div
            key={room}
            onClick={() => toggleRoom(room)}
            className={`mainPageFilterRadioInnerItem flex h-10 justify-center items-center transition-all duration-300 cursor-pointer
              ${selectedRooms.has(room) ? "!bg-blue-900 text-white" : "font-normal hover:!bg-blue-900 hover:text-white"}`}
          >
            {room}
          </div>
        ))}
      </div>
    </div>
  );
};

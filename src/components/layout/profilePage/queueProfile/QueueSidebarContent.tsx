"use client";

import { Button, ButtonGroup, Select, SelectItem } from "@heroui/react";
import { REDIRECT_WINDOW_OPTIONS } from "./constants";

const SELECT_CLASSES = {
  base: "w-full bg-[#F4F6FB]",
  label: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
  trigger: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
  listbox: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
};

export type QueueSidebarContentProps =
  | {
      mode: "withClient";
      redirectWindow: string;
      callServicePhase: "waiting" | "servicing";
      waitingElapsedSeconds: number;
      onRedirectWindowChange: (key: string) => void;
      onRedirect: () => void;
      onClientArrived: () => void;
      onFinishService: () => void;
    }
  | {
      mode: "waitingForNext";
      countdown: number;
      onCallClient: () => void;
    };

export default function QueueSidebarContent(props: QueueSidebarContentProps) {
  if (props.mode === "withClient") {
    const {
      redirectWindow,
      callServicePhase,
      onRedirectWindowChange,
      onRedirect,
      onClientArrived,
      onFinishService,
    } = props;
    const isWaiting = callServicePhase === "waiting";

    return (
      <div className="flex flex-col items-start gap-[24px] self-stretch">
        <div className="flex p-[16px] flex-col items-start gap-[10px] self-stretch rounded-[24px] bg-[#F4F6FB]">
          <div className="flex flex-col items-start gap-[12px] self-stretch">
            <h1 className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
              Перенаправление клиента
            </h1>
            <div className="flex flex-col items-start gap-[12px] self-stretch">
              <p className="text-[rgba(7,_7,_31,_0.48)] text-[14px] not-italic font-normal leading-[normal]">
                Выберите окно
              </p>
              <Select
                placeholder="Перенаправление"
                selectedKeys={redirectWindow ? [redirectWindow] : []}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0];
                  onRedirectWindowChange(key != null ? String(key) : "");
                }}
                classNames={SELECT_CLASSES}
              >
                {REDIRECT_WINDOW_OPTIONS.map((opt) => (
                  <SelectItem key={opt.key}>{opt.label}</SelectItem>
                ))}
              </Select>
              <Button
                isDisabled={!redirectWindow}
                onPress={onRedirect}
                className="flex w-[100%] h-[40px] p-0 min-w-[100%] min-h-[40px] justify-center items-center gap-[4px] rounded-[12px] bg-[#1A3C7E] disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">
                  Перенаправить
                </span>
              </Button>
            </div>
          </div>
        </div>

        {isWaiting ? (
          <div className="flex flex-col items-start gap-[12px] self-stretch">
            <p className="text-[#1E1E1E] text-[16px] not-italic font-medium leading-[normal]">
              Клиент явился?
            </p>
            <ButtonGroup className="w-full" size="lg" variant="flat">
              <Button
                onPress={onClientArrived}
                className="flex-1 rounded-[12px] bg-[#1A3C7E] text-[#FFF]"
              >
                Да
              </Button>
              <Button
                onPress={onFinishService}
                className="flex-1 rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
              >
                Нет
              </Button>
            </ButtonGroup>
          </div>
        ) : (
          <Button
            onPress={onFinishService}
            className="flex h-[52px] min-w-[52px] min-h-[52px] p-[15px] justify-center items-center gap-[4px] self-stretch rounded-[24px] border-[1px] border-solid border-[rgba(19,44,94,0.24)] bg-[#DB1D31]"
          >
            <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">
              Завершить обслуживание
            </span>
          </Button>
        )}
      </div>
    );
  }

  const { countdown, onCallClient } = props;
  return (
    <div className="flex flex-col items-start gap-[24px] self-stretch">
      <div className="flex p-[16px] flex-col items-start gap-[12px] self-stretch rounded-[24px] bg-[#F4F6FB]">
        <h1 className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
          Время до следующего клиента
        </h1>
        <div className="flex items-center justify-center self-stretch py-4">
          <span className="text-[#1A3C7E] text-[32px] not-italic font-bold tabular-nums">
            {countdown} с
          </span>
        </div>
      </div>
      <Button
        onPress={onCallClient}
        className="flex h-[52px] min-w-[52px] min-h-[52px] p-[15px] justify-center items-center gap-[4px] self-stretch rounded-[24px] bg-[#1A3C7E]"
      >
        <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">
          Вызвать
        </span>
      </Button>
    </div>
  );
}

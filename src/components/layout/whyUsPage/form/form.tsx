"use client";

import { Button, Input } from "@heroui/react";
import { withMask } from "use-mask-input";
import { useId, useState, type FormEvent } from "react";
import Image from "next/image";

const CV_ACCEPT =
  ".docx,.doc,.pdf,.png,.jpg,.jpeg,.xlsx,.rtf,image/png,image/jpeg,application/pdf";

export default function WhyUsForm() {
  const cvInputId = useId();
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitMessage(null);
    setIsSubmitting(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);

      const response = await fetch("/api/hr-request", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error("submit_failed");
      }

      form.reset();
      setCvFileName(null);
      setSubmitMessage("Заявка успешно отправлена. Мы скоро с вами свяжемся.");
    } catch {
      setSubmitError("Не удалось отправить заявку. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <div className="wrapper">
        <div className="flex flex-col items-center justify-center py-20 max-lg:py-15 gap-6">
            <div className="self-stretch justify-center text-zinc-900 text-4xl font-medium font-['Gotham'] leading-10">Стать частью команды</div>
            <div className="flex flex-row justify-between gap-6 w-full max-lg:flex-col max-lg:items-center">
                <div className="relative w-1/2 rounded-[32px] overflow-hidden bg-black/5 max-lg:w-full max-lg:h-[200px]">
                    <Image
                        src="/img/why-us-form-poster.jpg"
                        alt="Why us form poster"
                        fill
                        className="object-cover object-[50%_20%] h-full"
                        quality={100}
                    />
                </div>
                <div className="w-1/2 max-lg:w-full">
                    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
                        <div className="flex flex-row justify-between gap-3 max-lg:flex-col">
                            <label htmlFor="name" className="flex-1">
                                <div className="text-Color-Jeans-blue-Dark text-base font-bold font-['Gotham'] leading-5 mb-3">ФИО</div>
                                <Input type="text" name="name" id="name" classNames={{
                                    input: "w-full",
                                }} className="bg-[#F4F6FB] rounded-[12px]" placeholder="Введите ваше полное имя" isRequired />
                            </label>
                            <label htmlFor="phone" className="flex-1">
                                <div className="text-Color-Jeans-blue-Dark text-base font-bold font-['Gotham'] leading-5 mb-3">Телефон</div>
                                <Input
                                    name="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    ref={withMask("+7 (999) 999-99-99")}
                                    classNames={{
                                        input: "w-full",
                                    }}
                                    className="bg-[#F4F6FB] rounded-[12px]"
                                    isRequired
                                />
                            </label>
                        </div>
                        <div className="flex flex-col gap-3">
                            <label htmlFor="email">
                                <div className="text-Color-Jeans-blue-Dark text-base font-bold font-['Gotham'] leading-5 mb-3">Электронная почта</div>
                                <Input type="email" name="email" id="email" className="w-full" placeholder="Введите вашу электронную почту" isRequired />
                            </label>
                            <div className="w-full">
                                <label
                                    htmlFor={cvInputId}
                                    className="self-stretch block cursor-pointer"
                                >
                                    <div className="text-Color-Jeans-blue-Dark text-base font-bold font-['Gotham'] leading-5 mb-3">Прикрепите резюме</div>
                                    <div className="self-stretch w-full p-6 bg-slate-100 rounded-3xl outline outline-2 outline-offset-[-2px] outline-neutral-200 flex flex-col justify-start items-stretch gap-3">
                                        <div className="self-stretch flex flex-row flex-wrap sm:flex-nowrap justify-start items-start gap-3">
                                            <div className="min-w-0 flex-1 flex flex-col justify-start items-start gap-1">
                                                <div className="self-stretch text-left text-[#282D3C] text-base font-bold font-['Gotham'] tracking-tight">
                                                    Загрузите файл с резюме
                                                </div>
                                                <div className="text-left text-zinc-500 text-sm font-normal font-['Gotham'] tracking-tight">
                                                    Допустимые форматы: docx, doc, pdf, png, jpg, xlsx, rtf.{" "}
                                                    <br />
                                                    Максимальный размер файла - 10MB
                                                </div>
                                                {cvFileName ? (
                                                    <div
                                                        className="self-stretch text-left text-[#1A3C7E] text-sm font-medium font-['Gotham'] tracking-tight pt-1 truncate"
                                                        title={cvFileName}
                                                    >
                                                        {cvFileName}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div
                                                className="w-6 h-6 shrink-0 relative rounded-[5px] overflow-hidden"
                                                aria-hidden
                                            >
                                                <img src="/img/Upload Icon.svg" alt="Upload icon" width={20} height={20} />
                                            </div>
                                        </div>
                                    </div>
                                </label>
                                <input
                                    id={cvInputId}
                                    type="file"
                                    name="cv"
                                    className="sr-only"
                                    accept={CV_ACCEPT}
                                    required
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        setCvFileName(file ? file.name : null);
                                    }}
                                />
                            </div>
                            {submitMessage ? (
                                <p className="text-sm text-emerald-600">{submitMessage}</p>
                            ) : null}
                            {submitError ? (
                                <p className="text-sm text-red-600">{submitError}</p>
                            ) : null}
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                isDisabled={isSubmitting}
                                className="self-stretch h-12 min-w-12 min-h-12 px-3.5 pt-3.5 pb-4 bg-[#1A3C7E] rounded-2xl inline-flex justify-center items-center text-white text-base font-medium leading-5"
                            >
                                Отправить заявку
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
}
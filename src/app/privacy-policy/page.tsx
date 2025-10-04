"use server";

import React from "react";
import MainTemplate from "@/components/common/main-template/main-template";

async function Page() {
  return (
    <MainTemplate>
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-12">
        <section id="what-are-cookies" className="scroll-mt-24">
          <h2 className="text-xl font-semibold">
            Что такое cookie и зачем они нужны
          </h2>
          <div className="mt-3 space-y-3 text-slate-700">
            <p>
              Файлы cookie — это небольшие данные, которые сохраняются на вашем
              устройстве веб-сервером. Они позволяют запомнить ваши действия на
              сайте, сохранить настройки, ускорить загрузку страниц и улучшить
              взаимодействие с сервисом в целом.
            </p>
            <p>
              Мы применяем как временные (сессионные) cookie, которые удаляются
              после закрытия браузера, так и постоянные — они сохраняются на
              устройстве дольше и помогают узнавать вас при повторных визитах.
            </p>
          </div>
        </section>

        <section id="what-we-collect" className="scroll-mt-24">
          <h2 className="text-xl font-semibold">Какие данные мы получаем</h2>
          <p className="mt-3 text-slate-700">Среди собираемой информации:</p>
          <ul className="mt-4 list-disc pl-6 space-y-2 text-slate-700">
            <li>IP-адрес и характеристики устройства;</li>
            <li>тип браузера и операционной системы;</li>
            <li>файлы cookie;</li>
            <li>длительность сессии и количество просмотренных страниц;</li>
            <li>источники переходов на сайт и поисковые запросы;</li>
            <li>уникальные идентификаторы устройств и сессий.</li>
          </ul>
          <p className="mt-3 text-slate-600">
            Набор данных может отличаться в зависимости от вашего устройства и
            установленного ПО.
          </p>
        </section>

        <section id="why-we-use" className="scroll-mt-24">
          <h2 className="text-xl font-semibold">Зачем мы используем cookie</h2>
          <p className="mt-3 text-slate-700">
            Сбор и использование cookie осуществляется для:
          </p>
          <ul className="mt-4 list-disc pl-6 space-y-2 text-slate-700">
            <li>корректной работы сайта и всех его функций;</li>
            <li>анализа статистики посещений;</li>
            <li>запоминания ваших предпочтений;</li>
            <li>улучшения качества предоставляемых сервисов;</li>
            <li>проведения маркетингового и технического анализа.</li>
          </ul>
          <p className="mt-3 text-slate-700">
            Для этого могут использоваться внешние аналитические системы,
            например, Яндекс.Метрика.
          </p>

          <div className="mt-6">
            <h3 className="font-medium text-slate-800">
              Типы используемых cookie:
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-sm">
                Необходимые (технические)
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-sm">
                Аналитические и маркетинговые
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-sm">
                Функциональные
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="font-semibold">Необходимые</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Обеспечивают базовую функциональность сайта.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="font-semibold">Аналитические и маркетинговые</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Позволяют отслеживать поведение пользователей и оценивать
                  эффективность.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="font-semibold">Функциональные</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Делают использование сайта удобнее (язык интерфейса, настройки
                  и т. п.).
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="manage-cookies" className="scroll-mt-24">
          <h2 className="text-xl font-semibold">Как управлять cookie</h2>
          <div className="mt-3 space-y-3 text-slate-700">
            <p>
              Вы можете контролировать работу cookie в настройках вашего
              браузера или устройства: разрешать, блокировать или удалять их.
              Однако при отключении cookie некоторые функции сайта могут
              работать некорректно.
            </p>
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="font-medium text-amber-900">
                Отключение передачи данных в Яндекс.Метрику
              </p>
              <p className="mt-2 text-sm text-amber-900">
                Если вы не хотите, чтобы данные передавались в Яндекс.Метрику,
                воспользуйтесь официальным инструментом для отключения
                отслеживания —
                <a
                  className="underline underline-offset-2 hover:no-underline"
                  href="https://yandex.ru/support/metrica/general/opt-out.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Блокировщиком Яндекс.Метрики
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </MainTemplate>
  );
}

export default Page;

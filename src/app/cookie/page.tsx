import MainTemplate from "@/components/common/main-template/main-template";

function Cookie() {
  return (
    <MainTemplate bodyColor="#fff">
      <div className="wrapper !pt-10 max-w-4xl mx-auto text-gray-800">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
          Политика в отношении использования файлов cookie
        </h1>

        <p className="mb-4 leading-relaxed">
          На нашем сайте используется технология cookie, с помощью которой мы
          получаем техническую информацию о пользователях во время их посещения
          ресурса. Нажимая кнопку «Ок» в уведомлении о cookie, вы соглашаетесь
          на обработку этих данных.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">
          Что такое cookie и зачем они нужны
        </h2>
        <p className="mb-3 leading-relaxed">
          Файлы cookie — это небольшие данные, которые сохраняются на вашем
          устройстве веб-сервером. Они позволяют запомнить ваши действия на
          сайте, сохранить настройки, ускорить загрузку страниц и улучшить
          взаимодействие с сервисом в целом.
        </p>
        <p className="mb-4 leading-relaxed">
          Мы применяем как временные (сессионные) cookie, которые удаляются
          после закрытия браузера, так и постоянные — они сохраняются на
          устройстве дольше и помогают узнавать вас при повторных визитах.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">
          Какие данные мы получаем
        </h2>
        <p className="mb-2">Среди собираемой информации:</p>
        <ul className="list-disc list-inside space-y-1 mb-4">
          <li>IP-адрес и характеристики устройства;</li>
          <li>тип браузера и операционной системы;</li>
          <li>файлы cookie;</li>
          <li>длительность сессии и количество просмотренных страниц;</li>
          <li>источники переходов на сайт и поисковые запросы;</li>
          <li>уникальные идентификаторы устройств и сессий.</li>
        </ul>
        <p className="mb-4">
          Набор данных может отличаться в зависимости от вашего устройства и
          установленного ПО.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">
          Зачем мы используем cookie
        </h2>
        <p className="mb-2">Сбор и использование cookie осуществляется для:</p>
        <ul className="list-disc list-inside space-y-1 mb-4">
          <li>корректной работы сайта и всех его функций;</li>
          <li>анализа статистики посещений;</li>
          <li>запоминания ваших предпочтений;</li>
          <li>улучшения качества предоставляемых сервисов;</li>
          <li>проведения маркетингового и технического анализа.</li>
        </ul>
        <p className="mb-4">
          Для этого могут использоваться внешние аналитические системы,
          например, Яндекс.Метрика.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-2 text-gray-900">
          Типы используемых cookie:
        </h3>
        <ul className="list-disc list-inside space-y-1 mb-6">
          <li>
            <strong>Необходимые (технические)</strong> — обеспечивают базовую
            функциональность сайта;
          </li>
          <li>
            <strong>Аналитические и маркетинговые</strong> — позволяют
            отслеживать поведение пользователей и анализировать эффективность;
          </li>
          <li>
            <strong>Функциональные</strong> — делают использование сайта
            удобнее, например, запоминая язык интерфейса или другие настройки.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2 text-gray-900">
          Как управлять cookie
        </h2>
        <p className="mb-3 leading-relaxed">
          Вы можете контролировать работу cookie в настройках вашего браузера
          или устройства: разрешать, блокировать или удалять их. Однако при
          отключении cookie некоторые функции сайта могут работать некорректно.
        </p>

        <p className="mb-1">
          Если вы не хотите, чтобы данные передавались в Яндекс.Метрику, вы
          можете воспользоваться официальным инструментом для отключения
          отслеживания:
        </p>
        <p>
          <strong>Блокировщик Яндекс.Метрики:</strong>{" "}
          <a
            href="https://yandex.ru/support/metrica/general/opt-out.html"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            https://yandex.ru/support/metrica/general/opt-out.html
          </a>
        </p>
      </div>
    </MainTemplate>
  );
}

export default Cookie;

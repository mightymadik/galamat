type BiometricMappedError = {
  code: string;
  message: string;
  status: number;
};

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

export function mapBiometricError(status: number, payload: any): BiometricMappedError {
  const detail = toText(payload?.detail);
  const message = toText(payload?.message);
  const raw = `${detail} ${message}`.trim();

  if (status === 404 && includesAny(raw, ["Subject not found in MCDB"])) {
    return {
      status: 404,
      code: "biometric_subject_not_found",
      message: "Пользователь не зарегистрирован в БМГ.",
    };
  }

  if (status === 503 && includesAny(raw, ["Can`t connect to e-document service", "Can't connect to e-document service"])) {
    return {
      status: 503,
      code: "biometric_egov_connection_failed",
      message: "Не получается подключиться к государственному сервису Egov.",
    };
  }

  if (status === 503 && includesAny(raw, ["EDocument service is not available now"])) {
    return {
      status: 503,
      code: "biometric_egov_unavailable",
      message: "Государственный сервис Egov на данный момент недоступен.",
    };
  }

  if (status === 504 && includesAny(raw, ["Could not send request to e-document service"])) {
    return {
      status: 504,
      code: "biometric_egov_timeout",
      message: "Таймаут запроса к государственному сервису Egov.",
    };
  }

  if (status === 424 && includesAny(raw, ["Government service error"])) {
    return {
      status: 424,
      code: "biometric_egov_unhandled_response",
      message: "Получен необрабатываемый ответ от государственного сервиса Egov.",
    };
  }

  if (status === 404 && includesAny(raw, ["Profile is not found"])) {
    return {
      status: 404,
      code: "biometric_profile_not_found",
      message: "Профиль запрашиваемого гражданина не найден.",
    };
  }

  if (status === 400 && includesAny(raw, ["Invalid IIN"])) {
    return {
      status: 400,
      code: "biometric_invalid_iin",
      message: "Неверный ИИН.",
    };
  }

  if (status === 400 && includesAny(raw, ["EDocument for this session has already been received"])) {
    return {
      status: 400,
      code: "biometric_session_document_already_received",
      message: "Документ для этой сессии уже получен.",
    };
  }

  if (status === 400 && includesAny(raw, ["Client does not have access to E-Document technology"])) {
    return {
      status: 400,
      code: "biometric_no_technology_access",
      message: "У клиента нет доступа к технологии E-Document.",
    };
  }

  if (status === 400 && includesAny(raw, ["You have already requested a document for this session"])) {
    return {
      status: 400,
      code: "biometric_session_request_already_exists",
      message: "Нельзя делать несколько запросов с одной сессией.",
    };
  }

  if (status === 400 && includesAny(raw, ["You have not sent a request for access to an e-document"])) {
    return {
      status: 400,
      code: "biometric_session_request_missing",
      message: "Пользователь не запросил доступ к электронному документу.",
    };
  }

  if (status === 400 && includesAny(raw, ["Subscription has not started"])) {
    return {
      status: 400,
      code: "biometric_subscription_not_started",
      message: "Подписка еще не активировалась.",
    };
  }

  if (status === 400 && includesAny(raw, ["No active or future subscription for technology"])) {
    return {
      status: 400,
      code: "biometric_no_active_subscription",
      message: "Нет активной или будущей подписки на технологию.",
    };
  }

  if (status === 400 && includesAny(raw, ["Client does not have subscription"])) {
    return {
      status: 400,
      code: "biometric_client_has_no_subscription",
      message: "У клиента отсутствует подписка.",
    };
  }

  return {
    status: status || 502,
    code: "biometric_request_failed",
    message: "Не удалось выполнить запрос к биометрическому сервису.",
  };
}

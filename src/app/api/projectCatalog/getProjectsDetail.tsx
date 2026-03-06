import { apiGet } from "@/app/api/fetcher";
import { ProjectDetail } from "@/types/projectCatalog";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

const BACKEND_URL = process.env.STRAPI_URL!;

// Функция для API Routes, которая получает cookies из request
async function apiGetForRoute(
  path: string,
  params: Record<string, string>,
  cookieHeader?: string
) {
  const locale = cookieHeader
    ? cookieHeader
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1] || "ru"
    : "ru";

  const city = cookieHeader
    ? cookieHeader
      .split("; ")
      .find((row) => row.startsWith("city="))
      ?.split("=")[1] || "Astana"
    : "Astana";

  const baseUrl = getStrapiBaseUrl();
  const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path}`);

  if (!url.searchParams.has("locale")) {
    url.searchParams.set("locale", locale);
  }

  // Фильтр по городу добавляется первым с индексом 0
  // Затем нужно сдвинуть все индексы фильтров из params на +1
  if (city) {
    url.searchParams.set("filters[$and][0][cities][cityName][$eq]", city);
  }

  // Группируем параметры по ключам для обработки повторяющихся значений ($in)
  const paramsMap = new Map<string, string[]>();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (!paramsMap.has(key)) {
      paramsMap.set(key, []);
    }
    paramsMap.get(key)!.push(value);
  });

  // Добавляем params, сдвигая индексы фильтров на +1 если есть фильтр города
  paramsMap.forEach((values, key) => {
    const isFilterKey = key.includes("filters[$and]");
    const isInOperator = key.includes("[$in]");

    if (city && isFilterKey) {
      // Сдвигаем индекс фильтра на +1, так как город занимает индекс 0
      const newKey = key.replace(
        /filters\[\$and\]\[(\d+)\]/,
        (match, index) => {
          const newIndex = parseInt(index, 10) + 1;
          return `filters[$and][${newIndex}]`;
        }
      );

      // Для $in используем append для каждого значения
      if (isInOperator && values.length > 1) {
        values.forEach((val) => {
          url.searchParams.append(newKey, val);
        });
      } else {
        url.searchParams.set(newKey, values[0]);
      }
    } else {
      // Для $in используем append для каждого значения
      if (isInOperator && values.length > 1) {
        values.forEach((val) => {
          url.searchParams.append(key, val);
        });
      } else {
        url.searchParams.set(key, values[0]);
      }
    }
  });

  // Логируем финальный URL для отладки
  if (process.env.NODE_ENV === "development") {
    console.log("Final API URL:", url.toString());
  }

  const headers = { ...getStrapiHeaders(), "Accept-Language": locale };
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("API Request URL:", url.toString());
    }
    const response = await strapiAxios.get(url.toString(), { headers });
    return response.data;
  } catch (err: any) {
    console.error("Strapi API Error:", err.response?.data || err.message);
    console.error("Request URL:", url.toString());
    throw new Error(err?.message || "Fetch error");
  }
}

export interface ProjectFilters {
  priceMin?: number;
  priceMax?: number;
  pricePerM2Min?: number;
  pricePerM2Max?: number;
  areaMin?: number;
  areaMax?: number;
  rooms?: string | string[]; // Поддерживаем как одно значение, так и массив
  district?: string;
  complex?: string;
  category?: string; // Ипотека, Рассрочка, Комфорт, Комфорт+, Стандарт
}

export async function getProjectsDetails(
  projectSlug?: string,
  filters?: ProjectFilters,
  cookieHeader?: string
): Promise<ProjectDetail[]> {
  const params: Record<string, string> = {
    "fields[0]": "complexName",
    "fields[1]": "complexAddress",
    "fields[2]": "complexClass",
    "fields[3]": "complexDueDate",
    "fields[4]": "complexPaymentMethod",
    "fields[5]": "projectSlug",

    "populate[complexPreview][populate]": "*",
    "populate[complexHero][populate][complexHeroPrimaryPromo][fields][0]":
      "saleStart",
    "populate[complexHero][populate][complexHeroPrimaryPromo][fields][1]":
      "complexHeroPrimaryPromoDate",
    "populate[project][populate][property][fields][0]": "room",
    "populate[project][populate][property][fields][1]": "totalArea",
    "populate[project][populate][property][fields][2]": "priceCheckmate",
    "populate[project][populate][property][filters][propertyStatus][$eq]": "свободно",
    "populate[project][populate][complexes][fields][0]": "complexClass",

    "sort[0]": "createdAt:desc",
  };

  let filterIndex = 0;

  if (projectSlug) {
    params[`filters[$and][${filterIndex}][projectSlug][$eq]`] = projectSlug;
    filterIndex++;
  }

  // Фильтр по цене
  // priceMin - минимальная цена, используем $gte (больше или равно)
  if (filters?.priceMin !== undefined && filters.priceMin > 0) {
    params[`filters[$and][${filterIndex}][project][property][priceCheckmate][$gte]`] =
      String(filters.priceMin);
    filterIndex++;
  }

  // priceMax - максимальная цена, используем $lte (меньше или равно)
  if (filters?.priceMax !== undefined && filters.priceMax > 0) {
    params[`filters[$and][${filterIndex}][project][property][priceCheckmate][$lte]`] =
      String(filters.priceMax);
    filterIndex++;
  }

  // Фильтр по цене за м² (priceM2Checkmate)
  if (filters?.pricePerM2Min !== undefined && filters.pricePerM2Min > 0) {
    params[`filters[$and][${filterIndex}][project][property][priceM2Checkmate][$gte]`] =
      String(filters.pricePerM2Min);
    filterIndex++;
  }

  if (filters?.pricePerM2Max !== undefined && filters.pricePerM2Max > 0) {
    params[`filters[$and][${filterIndex}][project][property][priceM2Checkmate][$lte]`] =
      String(filters.pricePerM2Max);
    filterIndex++;
  }

  // Фильтр по площади (totalArea)
  if (filters?.areaMin !== undefined && filters.areaMin > 0) {
    params[`filters[$and][${filterIndex}][project][property][totalArea][$gte]`] =
      String(filters.areaMin);
    filterIndex++;
  }

  if (filters?.areaMax !== undefined && filters.areaMax > 0) {
    params[`filters[$and][${filterIndex}][project][property][totalArea][$lte]`] =
      String(filters.areaMax);
    filterIndex++;
  }

  // Фильтр по комнатности (room в property) - поддерживаем множественный выбор
  if (filters?.rooms) {
    const roomsArray = Array.isArray(filters.rooms) ? filters.rooms : [filters.rooms];
    if (roomsArray.length > 0) {
      // Используем $in для множественного выбора в Strapi
      // Для одного значения используем $eq, для нескольких - $in с повторяющимся ключом
      if (roomsArray.length === 1) {
        params[`filters[$and][${filterIndex}][project][property][room][$eq]`] = String(roomsArray[0]);
        filterIndex++;
      } else {
        // Для нескольких значений используем $in - каждое значение добавляется с тем же ключом
        // В apiGetForRoute мы обработаем это правильно через URLSearchParams.append
        roomsArray.forEach((room) => {
          params[`filters[$and][${filterIndex}][project][property][room][$in]`] = String(room);
        });
        filterIndex++;
      }
    }
  }

  // Фильтр по названию ЖК (projectName)
  if (filters?.complex) {
    params[`filters[$and][${filterIndex}][project][projectName][$eq]`] =
      filters.complex;
    filterIndex++;
  }

  // Фильтр по району (district)
  if (filters?.district) {
    params[`filters[$and][${filterIndex}][project][district][$eq]`] =
      filters.district;
    filterIndex++;
  }

  // Фильтр по категории (Ипотека, Рассрочка, или классы Комфорт/Комфорт+/Стандарт)
  if (filters?.category) {
    if (filters.category === "Ипотека") {
      // Фильтр по property.hypothec = true
      params[`filters[$and][${filterIndex}][project][property][hypothec][$eq]`] = "true";
      filterIndex++;
    } else if (filters.category === "Рассрочка") {
      // Фильтр по property.installment = true
      params[`filters[$and][${filterIndex}][project][property][installment][$eq]`] = "true";
      filterIndex++;
    } else if (["Комфорт", "Комфорт+", "Стандарт"].includes(filters.category)) {
      // Фильтр по complexClass - это прямое поле в complexes
      // "Комфорт+" в UI соответствует "Комфорт плюс" в базе данных
      const complexClassValue = filters.category === "Комфорт+" ? "Комфорт плюс" : filters.category;
      params[`filters[$and][${filterIndex}][complexClass][$eq]`] = complexClassValue;
      filterIndex++;
    }
  }

  // Используем apiGetForRoute если передан cookieHeader (для API Routes)
  // Иначе используем обычный apiGet (для Server Components)
  const res = cookieHeader
    ? await apiGetForRoute("/api/complexes", params, cookieHeader)
    : await apiGet({
      path: "/api/complexes",
      params,
    });

  if (!Array.isArray(res?.data)) throw new Error("Service Unavailable");

  return res.data.map((item: any) => {
    const hero = item.complexHero ?? {};
    const primary = hero.complexHeroPrimaryPromo ?? {};
    const secondary = hero.complexHeroSecondaryPromo ?? {};

    const previewGallery: string[] = Array.isArray(item.complexPreview)
      ? item.complexPreview
        .map((img: any) => {
          const url =
            img.formats?.large?.url ||
            img.formats?.thumbnail?.url ||
            img.url;
          return url ? `${BACKEND_URL}${url}` : null;
        })
        .filter(Boolean) as string[]
      : [];

    // Получаем property из проекта
    const properties = item.project?.property ?? [];

    // Группируем по комнатности и находим минимальную площадь и минимальную цену для каждой комнатности
    const flatsByRoom = new Map<number, { minArea: number; minPrice: number }>();

    properties.forEach((prop: any) => {
      if (!prop.room || !prop.totalArea || !prop.priceCheckmate) return;

      const room = parseInt(prop.room) || 0;
      const area = parseFloat(prop.totalArea) || 0;
      const price = parseInt(prop.priceCheckmate) || 0;

      if (room <= 0 || area <= 0 || price <= 0) return;

      if (!flatsByRoom.has(room)) {
        flatsByRoom.set(room, { minArea: area, minPrice: price });
      } else {
        const current = flatsByRoom.get(room)!;
        if (area < current.minArea) {
          current.minArea = area;
        }
        if (price < current.minPrice) {
          current.minPrice = price;
        }
      }
    });

    // Преобразуем в массив и форматируем данные
    const flats = Array.from(flatsByRoom.entries())
      .map(([room, data]) => ({
        type: `${room}-комнатная`,
        area: `${data.minArea.toFixed(1)} м²`,
        price: `${data.minPrice.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`,
      }))
      .sort((a, b) => {
        // Сортируем по комнатности
        const getRoomCount = (type: string): number => {
          const match = type.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getRoomCount(a.type) - getRoomCount(b.type);
      });

    return {
      id: item.id,
      projectSlug: item.projectSlug,

      complexName: item.complexName ?? "",
      complexAddress: item.complexAddress ?? "",
      complexClass: item.complexClass ?? "",
      complexDueDate: item.complexDueDate ?? "",
      complexPaymentMethod: item.complexPaymentMethod ?? "",

      previewGallery,

      saleStart: primary.saleStart ?? false,
      complexHeroPrimaryPromoDate:
        primary.complexHeroPrimaryPromoDate ?? "",

      flats: flats,
      flatsCount: properties.length,
    };
  });
}

export { getProjectsDetails as getProjectsDetail };
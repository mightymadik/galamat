import { NextResponse } from "next/server";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieHeader = req.headers.get("cookie") || "";
    
    const type = searchParams.get("type"); // rooms, complexes, districts, priceRange, priceM2Range, areaRange
    
    // Получаем locale и city из cookies
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
    const headers = { ...getStrapiHeaders(), "Accept-Language": locale };
    
    // Базовые параметры: город + только доступные к продаже квартиры
    const baseFilter = city ? `filters[project][city][cityName][$eq]=${encodeURIComponent(city)}&` : "";
    const availabilityFilter = `filters[propertyStatus][$eq]=свободно&filters[saleStatus][$eq]=открыто&filters[project][publishedAt][$notNull]=true&`;
    
    if (type === "rooms") {
      // Оптимизированный запрос: получаем только поле room, используем пагинацию для получения всех уникальных значений
      const roomsSet = new Set<string>();
      let page = 1;
      const pageSize = 100;
      
      while (true) {
        const url = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&fields[0]=room&locale=${locale}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
        
        const res = await strapiAxios.get(url, { headers });
        
        if (!Array.isArray(res?.data?.data)) break;
        
        res.data.data.forEach((item: any) => {
          if (item.room != null) {
            roomsSet.add(String(item.room));
          }
        });
        
        const pagination = res.data.meta?.pagination;
        if (!pagination || page >= pagination.pageCount || res.data.data.length < pageSize) {
          break;
        }
        page++;
        if (page > 100) break; // Защита
      }
      
      const rooms = Array.from(roomsSet)
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b)
        .map(String);
      
      return NextResponse.json({ data: rooms });
    }
    
    if (type === "complexes") {
      // Оптимизированный запрос: только project.projectName
      const complexesSet = new Set<string>();
      let page = 1;
      const pageSize = 100;
      
      while (true) {
        const url = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&fields[0]=id&populate[project][fields][0]=projectName&locale=${locale}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
        
        const res = await strapiAxios.get(url, { headers });
        
        if (!Array.isArray(res?.data?.data)) break;
        
        res.data.data.forEach((item: any) => {
          const name = item.project?.projectName;
          if (name && name !== "") {
            complexesSet.add(name);
          }
        });
        
        const pagination = res.data.meta?.pagination;
        if (!pagination || page >= pagination.pageCount || res.data.data.length < pageSize) {
          break;
        }
        page++;
        if (page > 100) break;
      }
      
      const complexes = Array.from(complexesSet).sort();
      return NextResponse.json({ data: complexes });
    }
    
    if (type === "districts") {
      // Оптимизированный запрос: только project.district
      const districtsSet = new Set<string>();
      let page = 1;
      const pageSize = 100;
      
      while (true) {
        const url = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&fields[0]=id&populate[project][fields][0]=district&locale=${locale}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
        
        const res = await strapiAxios.get(url, { headers });
        
        if (!Array.isArray(res?.data?.data)) break;
        
        res.data.data.forEach((item: any) => {
          const district = item.project?.district;
          if (district && district !== "") {
            districtsSet.add(district);
          }
        });
        
        const pagination = res.data.meta?.pagination;
        if (!pagination || page >= pagination.pageCount || res.data.data.length < pageSize) {
          break;
        }
        page++;
        if (page > 100) break;
      }
      
      const districts = Array.from(districtsSet).sort();
      return NextResponse.json({ data: districts });
    }
    
    if (type === "priceRange") {
      // Оптимизированный запрос: используем сортировку для получения min и max за 2 запроса
      const minUrl = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&fields[0]=priceCheckmate&locale=${locale}&sort[0]=priceCheckmate:asc&pagination[page]=1&pagination[pageSize]=1`;
      const maxUrl = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&fields[0]=priceCheckmate&locale=${locale}&sort[0]=priceCheckmate:desc&pagination[page]=1&pagination[pageSize]=1`;
      
      const [minRes, maxRes] = await Promise.all([
        strapiAxios.get(minUrl, { headers }),
        strapiAxios.get(maxUrl, { headers }),
      ]);
      
      const minPrice = minRes?.data?.data?.[0]?.priceCheckmate || 0;
      const maxPrice = maxRes?.data?.data?.[0]?.priceCheckmate || 0;
      
      return NextResponse.json({
        data: {
          min: Number(minPrice) || 0,
          max: Number(maxPrice) || 0,
        },
      });
    }
    
    if (type === "priceM2Range") {
      // Оптимизированный запрос: используем сортировку для получения min и max за 2 запроса
      const minUrl = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&filters[priceM2Checkmate][$gte]=300000&fields[0]=priceM2Checkmate&locale=${locale}&sort[0]=priceM2Checkmate:asc&pagination[page]=1&pagination[pageSize]=1`;
      const maxUrl = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&filters[priceM2Checkmate][$gte]=300000&fields[0]=priceM2Checkmate&locale=${locale}&sort[0]=priceM2Checkmate:desc&pagination[page]=1&pagination[pageSize]=1`;
      
      const [minRes, maxRes] = await Promise.all([
        strapiAxios.get(minUrl, { headers }),
        strapiAxios.get(maxUrl, { headers }),
      ]);
      
      const minPrice = minRes?.data?.data?.[0]?.priceM2Checkmate || 0;
      const maxPrice = maxRes?.data?.data?.[0]?.priceM2Checkmate || 0;
      
      return NextResponse.json({
        data: {
          min: Number(minPrice) || 0,
          max: Number(maxPrice) || 0,
        },
      });
    }
    
    if (type === "areaRange") {
      // Оптимизированный запрос: используем сортировку для получения min и max за 2 запроса
      const minUrl = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&fields[0]=totalArea&locale=${locale}&sort[0]=totalArea:asc&pagination[page]=1&pagination[pageSize]=1&filters[totalArea][$gt]=0`;
      const maxUrl = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[priceCheckmate][$gte]=10000000&fields[0]=totalArea&locale=${locale}&sort[0]=totalArea:desc&pagination[page]=1&pagination[pageSize]=1&filters[totalArea][$gt]=0`;
      
      const [minRes, maxRes] = await Promise.all([
        strapiAxios.get(minUrl, { headers }),
        strapiAxios.get(maxUrl, { headers }),
      ]);
      
      const minArea = minRes?.data?.data?.[0]?.totalArea || 0;
      const maxArea = maxRes?.data?.data?.[0]?.totalArea || 0;
      
      return NextResponse.json({
        data: {
          min: Number(minArea) || 0,
          max: Number(maxArea) || 0,
        },
      });
    }
    
    return NextResponse.json({ data: [] });
  } catch (err: any) {
    console.error("Error fetching filter options:", err);
    console.error("Error details:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    return NextResponse.json(
      { 
        error: err.message || "Failed to fetch filter options",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}

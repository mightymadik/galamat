# Аудит логики программ оплаты

## Цепочка данных

1. **Бэкенд (Strapi)**  
   - `payment-condition`: программа (Полная оплата, Рассрочка, …), `paymentStatus` = «Активный», связь с `properties`.  
   - В каждой программе — повторяемый компонент `paymentCondition`: `downPayment` (ПВ 30%/50%/70%), `raise`, `paymentRule` (JSON: `{ filters: [{ field, operator, value }] }`).

2. **Загрузка квартиры (детальная страница)**  
   - `getPropertyByDocumentId`: сначала GET property, затем GET `/api/payment-conditions?filters[properties][documentId]=…&filters[paymentStatus][$eq]=Активный&populate[paymentCondition]=*`.  
   - Результат подставляется в `paymentConditions`; в каждом пункте есть `paymentCondition[]` с `paymentRule.filters`.

3. **Маппинг**  
   - `mapPaymentConditions` (getProperties.ts): из сырого ответа в `PaymentConditionForFlat[]`, сохраняет `paymentRule` у каждого элемента `paymentCondition`.

4. **Выбор подходящего условия**  
   - `flatAttrs`: объект с полями квартиры (room, totalArea, floor, floorGroup, section, entrance, apartmentNumber, house).  
   - `matchFlatToConditionFilters(flatAttrs, filters)`: пустые фильтры → подходит любая квартира; иначе все фильтры должны совпасть (числа с допуском, строки точное совпадение).  
   - `getMatchingOptions(options, flatAttrs)`: только подходящие опции; при отсутствии совпадений — только опции без фильтров; если и таких нет — `[]`.  
   - `getMatchingOption`: первый из результата `getMatchingOptions` (может быть `undefined`).

## Где используется flatAttrs

| Место | Источник flat | flatAttrs |
|-------|----------------|-----------|
| Страница квартиры (flatsDetailPage) | flat = FlatDetail (из API) | room, totalArea (из area, если нет), section, entrance, floor, floorGroup, apartmentNumber |
| Модалка оплаты (installment/full/deffered) | flatData = adaptFlat(originalFlat) или adaptPropertyToComponentFlat(api) | room, totalArea, house, section, entrance, floor, floorGroup, apartmentNumber |
| originalFlat (при открытии модалки со страницы квартиры) | adaptPropertyDetail(api) | Должен содержать totalArea, floorGroup, paymentConditions |

## Внесённые исправления (аудит 2025)

1. **getMatchingOptions**  
   Если ни одна опция не подошла по фильтрам и нет опций без фильтров — возвращается `[]`, а не все опции (раньше показывались неподходящие 30%/50%/70%).

2. **originalFlat**  
   В `adaptPropertyDetail` в originalFlat добавлены `totalArea` и `floorGroup`, чтобы в модалке были данные для фильтров условий.

3. **Тип Flat**  
   В `Flat` добавлены опциональные `totalArea` и `floorGroup`.

4. **adaptFlat (payModal)**  
   В ComponentFlat прокидываются `totalArea` (из flat.totalArea ?? flat.area) и `floorGroup`, чтобы в модалке рассрочки/полной оплаты работал подбор условия по квартире.

5. **PaymentConditionForFlat**  
   В типе элемента `paymentCondition` добавлен `paymentRule?: { filters?: ... }[]` для типобезопасности.

## Рекомендации

- Всегда передавать в превью/модалку полный набор полей квартиры (в т.ч. floorGroup, totalArea), иначе условия с фильтрами по ним не совпадут.  
- На бэкенде статус программы — «Активный» (рус.), запрос условий по квартире использует именно его.  
- Условия без фильтров считаются подходящими для любой квартиры; с фильтрами — только при строгом совпадении всех полей.

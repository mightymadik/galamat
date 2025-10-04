// import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
// import prisma from "@/lib/prisma";
//
// export async function StartParsing() {
//   try {
//     await startParsingF();
//
//     // 20 րոպեն մեկ կրկնել
//     setInterval(startParsingF, 1000 * 60 * 30);
//
//     return { success: true };
//   } catch (error) {
//     console.error("Ընդհանուր սխալ", error);
//     return { success: false, error };
//   }
// }
//
// async function startParsingF() {
//   try {
//     // Փուլ 1. Ստանում ենք բոլոր տների ID-ները
//     const housesResponse = await ActionGetProjectsProperty("/house", {
//       isArchive: false,
//       status: ["AVAILABLE"],
//     });
//
//     const houseIds = housesResponse.data.map((item: any) => item.id);
//     console.log(`Ստացվել է ${houseIds.length} տուն`);
//
//     // Փուլ 2. Հավաքում ենք բոլոր propertyId-ները
//     const allPropertyIds: number[] = [];
//
//     await Promise.all(
//       houseIds.map(async (houseId: number) => {
//         try {
//           const board: IBoard = await ActionGetProjectsProperty("/board", {
//             houseId,
//           });
//
//           for (const floor of board.floors ?? []) {
//             for (const section of floor.sections ?? []) {
//               for (const cell of section.cells ?? []) {
//                 if (cell.propertyId) {
//                   allPropertyIds.push(cell.propertyId);
//                 }
//               }
//             }
//           }
//         } catch (error) {
//           console.error(`❌ Սխալ տան ID ${houseId} համար`, error);
//         }
//       }),
//     );
//
//     console.log(`Ընդհանուր propertyIds: ${allPropertyIds.length}`);
//
//     // Փուլ 3. Թարմացնում ենք property-ները batch-երով
//     const batchSize = 100;
//     for (let i = 0; i < allPropertyIds.length; i += batchSize) {
//       const batch = allPropertyIds.slice(i, i + batchSize);
//
//       await Promise.all(
//         batch.map(async (propertyId, index) => {
//           try {
//             const response = await ActionGetProjectsProperty("/property", {
//               id: propertyId,
//             });
//
//             const data = response.data?.[0];
//             if (!data) {
//               console.warn(`⚠️ Property ${propertyId} data չկա`);
//               return;
//             }
//
//             // Ստուգում ենք արդյոք գոյություն ունի
//             const existing = await prisma.property.findUnique({
//               where: { property_id: propertyId },
//             });
//
//             if (existing) {
//               await prisma.property.update({
//                 where: { property_id: propertyId }, // ⚠️ միայն unique field
//                 data: { data },
//               });
//
//               console.log(
//                 `🔄 Թարմացված property_id: ${propertyId} (${i + index + 1}/${
//                   allPropertyIds.length
//                 })`,
//               );
//             } else {
//               await prisma.property.create({
//                 data: {
//                   property_id: propertyId,
//                   data,
//                 },
//               });
//               console.log(`✅ Ստեղծված property_id: ${propertyId}`);
//             }
//           } catch (e) {
//             // Քանի որ ուզում ես "չկանգնի", պարզապես log
//             console.error(`❌ Սխալ property_id ${propertyId} համար`, e);
//           }
//         }),
//       );
//     }
//
//     console.log("🏁 Բոլոր property-ները մշակված են");
//   } catch (error) {
//     console.error("❌ Ընդհանուր parsing սխալ", error);
//   }
// }

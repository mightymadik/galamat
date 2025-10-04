// import "./filter-wrapper.scss";
// import HorizontalFilter from "@/components/common/horizontal-filter/horizontal-filter";
// import { useState } from "react";
// import clsx from "clsx";
// import OurObjects from "@/components/layout/home/objects/our-objects";
// import ProductItem from "@/components/common/product-item/product-item";
// import { Spinner } from "@heroui/react";
// import { Button } from "@heroui/react";
// import { all } from "@/utils/consts";
// import { useTranslate } from "@/hooks/useTranslate";
//
// interface IThisProps {
//   _houses: IProjectStage[];
// }
//
// function FilterWrapper({ _houses }: IThisProps) {
//   const $t = useTranslate();
//
//   const [content, setContent] = useState<"items" | "map">("items");
//   const [mobileFilter, setMobileFilter] = useState<boolean>(false);
//
//   const allHouses = _houses;
//   const [houses, setHouses] = useState<IProjectStage[] | null>(_houses);
//   const [countSplits, setCountSplits] = useState<number>(6);
//
//   const [selectedRegion, setSelectedRegion] = useState<string>(all);
//   const [selectedProject, setSelectedProject] = useState<string>(all);
//   const [selectedFloor, setSelectedFloor] = useState<any>(all);
//   const [selectedRoom, setSelectedRoom] = useState<string[]>([]);
//   const [selectedMinMax, setSelectedMinMax] = useState<number[]>([]);
//
//   function SeeMore() {
//     setCountSplits(countSplits + 6);
//   }
//
//   function applyFilters(
//     region: string,
//     project: string,
//     floor: number,
//     room: string[],
//     price: number[],
//   ) {
//     let filtered = allHouses;
//
//     if (region !== all) {
//       filtered = filtered.filter((item) => item.address.region === region);
//     }
//
//     if (project !== all) {
//       filtered = filtered.filter((item) => item.projectName === project);
//     }
//
//     if (!isNaN(floor)) {
//       filtered = filtered.filter((item) => item.maxFloor === floor);
//     }
//
//     if (room.length !== 0) {
//       filtered = filtered.filter((item) =>
//         room.some((_r: "one" | "two" | "three" | "more_than_three") =>
//           item.roomsFilter.includes(_r),
//         ),
//       );
//     }
//
//     if (price.length) {
//       filtered = filtered.filter(
//         (item) => item.minPrice >= price[0] && item.minPrice <= price[1],
//       );
//     }
//
//     setHouses(filtered);
//   }
//
//   function selectRegion(key: string) {
//     setSelectedRegion(key);
//     applyFilters(
//       key,
//       selectedProject,
//       selectedFloor,
//       selectedRoom,
//       selectedMinMax,
//     );
//   }
//
//   function selectProject(key: string) {
//     setSelectedProject(key);
//     applyFilters(
//       selectedRegion,
//       key,
//       selectedFloor,
//       selectedRoom,
//       selectedMinMax,
//     );
//   }
//
//   function selectFloor(key: number) {
//     setSelectedFloor(key);
//     applyFilters(
//       selectedRegion,
//       selectedProject,
//       key,
//       selectedRoom,
//       selectedMinMax,
//     );
//   }
//
//   function selectRoom(key: string[]) {
//     setSelectedRoom(key);
//     applyFilters(
//       selectedRegion,
//       selectedProject,
//       selectedFloor,
//       key,
//       selectedMinMax,
//     );
//   }
//   function selectMinMax(key: number[]) {
//     setSelectedMinMax(key);
//     applyFilters(
//       selectedRegion,
//       selectedProject,
//       selectedFloor,
//       selectedRoom,
//       key,
//     );
//   }
//
//   return (
//     <div className="filter-wrapper">
//       <div className="wrapper">
//         <div className="title-wrap">
//           <h2 className="main-title">{$t("project_galamat")}</h2>
//           <div className="w-full md:w-[200px] border rounded-[6px] flex-je-c h-10 overflow-hidden">
//             <button
//               className={clsx("w-[100%] h-full rounded-[6px] bg-transparent", {
//                 "!bg-[#132C5E] text-white": content === "items",
//               })}
//               onClick={() => setContent("items")}
//             >
//               {$t("tile")}
//             </button>
//             <button
//               className={clsx("w-[100%] h-full rounded-[6px] bg-transparent", {
//                 "!bg-[#132C5E] text-white": content === "map",
//               })}
//               onClick={() => setContent("map")}
//             >
//               {$t("on_the_map")}
//             </button>
//           </div>
//           <div
//             className="filter-btn h-10 px-4 !flex-jc-c md:!hidden"
//             onClick={() => setMobileFilter(true)}
//           >
//             <i className="fa-regular fa-bars-filter mr-1"></i>
//             {$t("filter")}
//           </div>
//         </div>
//
//         <HorizontalFilter
//           className={mobileFilter ? "open" : ""}
//           houses={allHouses}
//           result={houses?.length || 0}
//           selectRegion={selectRegion}
//           selectProject={selectProject}
//           selectFloor={selectFloor}
//           onSelectRoom={selectRoom}
//           onSelectMinMax={selectMinMax}
//           onClose={() => setMobileFilter(false)}
//         />
//
//         {content === "items" && (
//           <div className="tabs2">
//             <div className="tab-content2 active" id="tab4">
//               <div className="product-items-wrap">
//                 {houses ? (
//                   <>
//                     {houses.length ? (
//                       <div className="product-items">
//                         {houses
//                           .slice(0, countSplits)
//                           .map((project: IProjectStage) => (
//                             <ProductItem
//                               key={`complex-${project.id}`}
//                               project={project}
//                             />
//                           ))}
//                       </div>
//                     ) : (
//                       <div className="w-full h-[400px] flex-jc-c">
//                         <h3 className="text-blue text-[18px] sm:text-[24px]">
//                           {$t("nothing_found_yet")}
//                         </h3>
//                       </div>
//                     )}
//
//                     {houses.length ? (
//                       <div className="show-wrap">
//                         <span>
//                           Показано{" "}
//                           {countSplits >= houses.length
//                             ? houses.length
//                             : countSplits}{" "}
//                           {$t("from")} {houses.length}
//                         </span>
//                         <Button
//                           className={clsx("show-btn bg-transparent h-[60px]", {
//                             "opacity-50 !cursor-default hover:opacity-50":
//                               countSplits >= houses.length,
//                           })}
//                           onPress={SeeMore}
//                           disabled={countSplits >= houses.length}
//                         >
//                           {$t("show_more")}
//                         </Button>
//                       </div>
//                     ) : null}
//                   </>
//                 ) : (
//                   <div className="w-full h-[400px] flex-jc-s pt-[200px]">
//                     <Spinner color="danger" />
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}
//         {content === "map" && (
//           <div className="w-full overflow-hidden rounded-[12px]">
//             <OurObjects height={800} className="!h-[450px] md:!h-[800px]" />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
//
// export default FilterWrapper;

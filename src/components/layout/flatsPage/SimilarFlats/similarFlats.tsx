// "use client"

// import { useState, useEffect } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import { Button } from "@heroui/button"
// import { getFlats } from "@/services/flats.services";
// import { Flat, FlatsFilterParams } from "@/types/flat";

// interface ComponentFlat {
//     id: number;
//     title: string;
//     address: string;
//     price: string;
//     priceM2: string;
//     tags: string[];
//     images: string[];
//     room: string;
//     area: string;
//     floor: string;
//     section: string;
//     entrance: string;
//     available: string;
// }

// const adaptFlat = (flat: Flat): ComponentFlat => {
//     // Convert tags from string/number to array of strings
//     let tags: string[] = [];
//     if (typeof flat.tags === 'string') {
//         tags = flat.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
//     } else if (typeof flat.tags === 'number') {
//         tags = [flat.tags.toString()];
//     }

//     // Convert images from string/number to array of strings
//     let images: string[] = [];
//     if (typeof flat.img === 'string') {
//         images = flat.img.split(',').map(img => img.trim()).filter(img => img.length > 0);
//     } else if (typeof flat.img === 'number') {
//         images = [flat.img.toString()];
//     }

//     // Format price with currency
//     const formattedPrice =
//         typeof flat.price === "number"
//             ? `${flat.price.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`
//             : `${flat.price} ₸`;

//     const formattedPriceM2 =
//         typeof flat.priceM2 === "number"
//             ? `${flat.priceM2.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸/м²`
//             : `${flat.priceM2} ₸/м²`;

//     return {
//         id: flat.id,
//         title: flat.title,
//         address: flat.address,
//         price: formattedPrice,
//         priceM2: formattedPriceM2,
//         tags: tags,
//         images: images,
//         room: flat.room.toString(),
//         area: `${flat.area} м²`,
//         floor: flat.floor.toString(),
//         section: flat.section.toString(),
//         entrance: flat.entrance.toString(),
//         available: flat.available.toString(),
//     };
// };

// interface SimilarFlatsProps {
//     currentFlatId?: number;
// }

// export default function SimilarFlats({ currentFlatId }: SimilarFlatsProps) {
//     const [similarFlats, setSimilarFlats] = useState<ComponentFlat[]>([]);
//     const [loading, setLoading] = useState(true);
    
//     useEffect(() => {
//         const fetchSimilarFlats = async () => {
//             try {
//                 // First, get the current flat to compare against
//                 if (!currentFlatId) {
//                     setLoading(false);
//                     return;
//                 }
                
//                 const allFlats = await getFlats();
//                 const currentFlat = allFlats.find(flat => flat.id === currentFlatId);
                
//                 if (!currentFlat) {
//                     setSimilarFlats([]);
//                     setLoading(false);
//                     return;
//                 }
                
//                 // Find similar flats based on area and price
//                 // We'll look for flats within 15% of the current flat's area and price
//                 const areaThreshold = currentFlat.area * 0.15;
//                 const priceThreshold = currentFlat.price * 0.15;
                
//                 const filteredFlats = allFlats
//                     .filter(flat => flat.id !== currentFlatId) // Exclude current flat
//                     .filter(flat => {
//                         // Check if area is within threshold
//                         const areaDifference = Math.abs(flat.area - currentFlat.area);
//                         const priceDifference = Math.abs(flat.price - currentFlat.price);
                        
//                         return areaDifference <= areaThreshold && priceDifference <= priceThreshold;
//                     })
//                     .slice(0, 4) // Limit to 4 similar flats
//                     .map(adaptFlat);
                
//                 setSimilarFlats(filteredFlats);
//             } catch (error) {
//                 console.error("Error fetching similar flats:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         if (currentFlatId) {
//             fetchSimilarFlats();
//         } else {
//             setLoading(false);
//         }
//     }, [currentFlatId]);

//     if (loading) {
//         return <div className="py-[40px]">Загрузка похожих квартир...</div>;
//     }

//     if (similarFlats.length === 0) {
//         return null;
//     }

//     return (
//         <div className="py-[40px]">
//             <div className="wrapper flex flex-col gap-[32px]">
//                 <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[41.76px]">
//                     Похожие квартиры
//                 </h1>
//                 <div className="flex flex-wrap gap-[24px]">
//                     {similarFlats.map((flat) => (
//                         <SimilarFlatCard key={flat.id} flat={flat} />
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// }

// function SimilarFlatCard({ flat }: { flat: ComponentFlat }) {
//     const [activeIndex, setActiveIndex] = useState(0);

//     const handleHover = (direction: "left" | "right") => {
//         if (flat.images && flat.images.length > 1) {
//             if (direction === "left") {
//                 setActiveIndex((prev) => (prev + 1) % flat.images.length);
//             } else {
//                 setActiveIndex((prev) =>
//                     prev === 0 ? flat.images.length - 1 : prev - 1
//                 );
//             }
//         }
//     };

//     return (
//         <Link
//             href={`/flats/${flat.id}`}
//             className="flex p-[16px] flex-col items-center gap-[24px] flex-[1_0_0] rounded-[18px] border-[2px] border-solid border-[#E3E3E3] bg-[#FFF] w-full h-full"
//         >
//             {/* Верхняя часть */}
//             <div className="flex flex-col items-start gap-[12px] self-stretch">
//                 <div className="flex items-center gap-[12px] self-stretch">
//                     <h1 className="flex-[1_0_0] text-[#07071F] text-[24px] font-medium">
//                         {flat.title}
//                     </h1>
//                     <div className="flex justify-end items-center gap-[4px] flex-[1_0_0] flex-wrap">
//                         {flat.tags.map((tag: string, i: number) => (
//                             <div
//                                 key={i}
//                                 className={`flex text-[10px] p-[4px] justify-center items-center rounded-[16px] leading-full ${tag === "Ипотека"
//                                     ? "bg-[#3682F5] text-[#FFF]"
//                                     : "bg-[#F4F5F9] text-[#282D3C]"
//                                     }`}
//                             >
//                                 {tag}
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//                 <p className="text-[#122C5E] text-[12px]">{flat.address}</p>
//             </div>

//             {/* Изображение */}
//             <div className="relative h-[205px] flex flex-col justify-center items-center gap-[8px] self-stretch">
//                 {/* Наведение */}
//                 <div
//                     className="absolute left-0 top-0 h-full w-1/2 z-10 cursor-pointer"
//                     onMouseEnter={() => handleHover("left")}
//                 ></div>
//                 <div
//                     className="absolute right-0 top-0 h-full w-1/2 z-10 cursor-pointer"
//                     onMouseEnter={() => handleHover("right")}
//                 ></div>

//                 {flat.images && flat.images.length > 0 && flat.images[activeIndex] ? (
//                     <Image
//                         src={flat.images[activeIndex]}
//                         alt={flat.title}
//                         width={216}
//                         height={193}
//                         className="transition-all duration-500 rounded-[12px]"
//                     />
//                 ) : (
//                     <div className="w-[216px] h-[193px] bg-gray-200 rounded-[12px] flex items-center justify-center">
//                         <span className="text-gray-500">No image</span>
//                     </div>
//                 )}
//             </div>

//             {/* Индикатор изображений */}
//             {flat.images && flat.images.length > 0 && (
//                 <div className="flex h-[4px] justify-center items-center gap-[9px] self-stretch opacity-80">
//                     {flat.images.map((_: any, i: number) => (
//                         <svg
//                             key={i}
//                             xmlns="http://www.w3.org/2000/svg"
//                             width="26"
//                             height="4"
//                             viewBox="0 0 26 4"
//                             fill="none"
//                         >
//                             <path
//                                 d="M2 2H23.8889"
//                                 stroke={i === activeIndex ? "#2655AF" : "black"}
//                                 strokeWidth="4"
//                                 strokeLinecap="round"
//                                 opacity={i === activeIndex ? 1 : 0.2}
//                             />
//                         </svg>
//                     ))}
//                 </div>
//             )}

//             {/* Цена и детали */}
//             <div className="flex flex-col items-start gap-[12px] self-stretch">
//                 <div className="flex flex-col items-start gap-[4px] self-stretch">
//                     <h1 className="text-[#07071F] text-[24px] font-medium">{flat.price}</h1>
//                     <span className="text-[#07071F] text-[16px] opacity-45">{flat.priceM2}</span>
//                 </div>
//                 <div className="flex items-center gap-[8px] self-stretch">
//                     <span className="text-[#07071F] text-[16px]">{flat.room} комн</span>
//                     <svg xmlns="http://www.w3.org/2000/svg" width="6" height="6">
//                         <circle cx="3" cy="3" r="3" fill="#CCCCCC" />
//                     </svg>
//                     <span className="text-[#07071F] text-[16px]">{flat.area}</span>
//                     <svg xmlns="http://www.w3.org/2000/svg" width="6" height="6">
//                         <circle cx="3" cy="3" r="3" fill="#CCCCCC" />
//                     </svg>
//                     <span className="text-[#07071F] text-[16px]">Этаж {flat.floor}</span>
//                 </div>
//             </div>

//             {/* Кнопки */}
//             <div className="flex items-center gap-[4px] self-stretch">
//                 <Button className="flex h-[44px] min-w-[44px] p-[13px] justify-center items-center flex-[1_0_0] rounded-[12px] bg-[#1A3C7E] text-[#FFF] text-[15px] font-medium">
//                     Купить
//                 </Button>
//                 <Button className="flex w-[44px] h-[44px] p-[13px] justify-center items-center rounded-[12px] bg-[#F4F6FB]">
//                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
//                         <path
//                             d="M1.333 6.091C1.333 9.333 4.013 11.061 5.975 12.607C6.667 13.153 7.333 13.667 8 13.667C8.667 13.667 9.333 13.153 10.026 12.607C11.987 11.061 14.667 9.333 14.667 6.091C14.667 2.849 11 0.55 8 3.667C5 0.55 1.333 2.849 1.333 6.091Z"
//                             fill="#1C274C"
//                         />
//                     </svg>
//                 </Button>
//             </div>
//         </Link>
//     );
// }
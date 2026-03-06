"use client";

import SortFlats from "@/components/layout/flatsPage/Parts/sortFlats";
import Block from "./block/block";
import List from "./list/list";
import Checkmate from "./checkmate/checkmate";
import CheckmatePro from "./checkmatePro/checkmatePro";
import { useState } from "react";
import { FlatsFilterParams } from "@/types/flat";

interface CatalogFlatsProps {
    filterParams?: FlatsFilterParams;
    onTotalCountChange?: (count: number) => void;
}

export default function CatalogFlats({ filterParams = {}, onTotalCountChange }: CatalogFlatsProps) {
    const [viewType, setViewType] = useState("block"); // "block" | "list" | "checkmate" | "checkmatePro"
    const [sortKey, setSortKey] = useState("lowestPrice");

    return (
        <div className="bg-white lg:bg-[#F4F6FB] py-[12px] lg:py-[40px]">
            <div className="wrapper flex flex-col items-center gap-[32px]">
                <SortFlats onViewChange={setViewType} onSortChange={setSortKey} />
                {viewType === "block" && <Block sortKey={sortKey} filterParams={filterParams} onTotalCountChange={onTotalCountChange} />}
                {viewType === "list" && <List sortKey={sortKey} filterParams={filterParams} onTotalCountChange={onTotalCountChange} />}
                {viewType === "checkmate" && <Checkmate filterParams={filterParams} onTotalCountChange={onTotalCountChange} />}
                {viewType === "checkmatePro" && <CheckmatePro filterParams={filterParams} onTotalCountChange={onTotalCountChange} />}
            </div>
        </div>
    );
}
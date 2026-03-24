"use client";

import SortFlats from "@/components/layout/flatsPage/Parts/sortFlats";
import Block from "./block/block";
import List from "./list/list";
import Checkmate from "./checkmate/checkmate";
import CheckmatePro from "./checkmatePro/checkmatePro";
import { useEffect, useState } from "react";
import { FlatsFilterParams } from "@/types/flat";
import type { RealEstateType } from "@/types/flat";

interface CatalogFlatsProps {
    filterParams?: FlatsFilterParams;
    onTotalCountChange?: (count: number) => void;
    onProjectChange?: (project: string | null) => void;
    realEstateType?: RealEstateType;
    detailBasePath?: string;
    initialViewType?: string;
    onViewTypeChange?: (view: string) => void;
}

export default function CatalogFlats({
    filterParams = {},
    onTotalCountChange,
    onProjectChange,
    realEstateType = "property",
    detailBasePath = "/flats",
    initialViewType = "block",
    onViewTypeChange,
}: CatalogFlatsProps) {
    const allowChessboard = realEstateType === "property";
    const [viewType, setViewType] = useState(initialViewType); // "block" | "list" | "checkmate" | "checkmatePro"
    const [sortKey, setSortKey] = useState("lowestPrice");
    useEffect(() => {
        setViewType(initialViewType);
    }, [initialViewType]);
    useEffect(() => {
        if (!allowChessboard && (viewType === "checkmate" || viewType === "checkmatePro")) {
            setViewType("block");
            onViewTypeChange?.("block");
        }
    }, [allowChessboard, viewType, onViewTypeChange]);

    return (
        <div className="bg-white lg:bg-[#F4F6FB] py-[12px] lg:py-[40px]">
            <div className="wrapper flex flex-col items-center gap-[32px]">
                <SortFlats
                    initialView={viewType}
                    onViewChange={(view) => {
                        setViewType(view);
                        onViewTypeChange?.(view);
                    }}
                    onSortChange={setSortKey}
                    allowChessboard={allowChessboard}
                />
                {viewType === "block" && <Block sortKey={sortKey} filterParams={filterParams} onTotalCountChange={onTotalCountChange} realEstateType={realEstateType} detailBasePath={detailBasePath} />}
                {viewType === "list" && <List sortKey={sortKey} filterParams={filterParams} onTotalCountChange={onTotalCountChange} realEstateType={realEstateType} detailBasePath={detailBasePath} />}
                {allowChessboard && viewType === "checkmate" && <Checkmate filterParams={filterParams} onTotalCountChange={onTotalCountChange} onProjectChange={onProjectChange} realEstateType={realEstateType} detailBasePath={detailBasePath} />}
                {allowChessboard && viewType === "checkmatePro" && <CheckmatePro filterParams={filterParams} onTotalCountChange={onTotalCountChange} onProjectChange={onProjectChange} realEstateType={realEstateType} detailBasePath={detailBasePath} />}
            </div>
        </div>
    );
}
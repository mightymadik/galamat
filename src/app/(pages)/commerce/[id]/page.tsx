"use client"

import withPreload from "@/components/common/preload/withPreload";
import FlatsDetailPage from "@/components/layout/flatsPage/FlatsDetailPage/flatsDetailPage"
// import SimilarFlats from "@/components/layout/flatsPage/SimilarFlats/similarFlats";
import { useParams } from "next/navigation"
import PayModal from "@/components/common/payModal/payModal";

function Page() {
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    
    return (
        <div className="mt-[68px]">
            {id && (
                <>
                    <FlatsDetailPage id={id} realEstateType="commerce" />
                    {/* <SimilarFlats currentFlatId={typeof id === 'string' ? parseInt(id) : undefined} /> */}
                    <PayModal id={id} realEstateType="commerce" />
                </>
            )}
        </div>
    )
}

export default withPreload(Page);
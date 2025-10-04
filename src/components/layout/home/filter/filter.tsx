import HorizontalFilter from "@/components/common/horizontal-filter/horizontal-filter";
import React, { useEffect, useState } from "react";
import CanvasViewHouse from "@/app/real-estate/canvas-view-house";
import { useDispatch, useSelector } from "react-redux";
import Facade from "@/app/real-estate/facade";
import { setHouse, setObjectInfo } from "@/redux/modals";

import "@/components/layout/home/filter-wrapper/filter-wrapper.scss";
import "@/components/layout/real-estate/real-estate.scss";

interface IThisProps {
  projects: IProjectMerged[];
}

function Filter({ projects }: IThisProps) {
  const dispatch = useDispatch();

  const objectInfo = useSelector(
    (state: IModalState) => state.modals.objectInfo,
  );
  const modalSelectedHouse = useSelector(
    (state: IModalState) => state.modals.modalSelectedHouse,
  );

  useEffect(() => {
    if (modalSelectedHouse) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    }
  }, [modalSelectedHouse]);

  function closeModal() {
    dispatch(setHouse(null));
    dispatch(setObjectInfo(null));
  }

  const [mobileFilter, setMobileFilter] = useState<boolean>(false);

  return (
    <section>
      <div className="filter-wrapper">
        <div className="wrapper !pt-6">
          <HorizontalFilter
            className={mobileFilter ? "open" : ""}
            projects={projects}
            onClose={() => setMobileFilter(false)}
          />

          <Facade projects={projects} fakeItem={1} />
        </div>
      </div>

      {objectInfo && modalSelectedHouse ? (
        <CanvasViewHouse
          house={modalSelectedHouse}
          objectInfo={objectInfo}
          onClose={closeModal}
          projects={projects}
        />
      ) : null}
    </section>
  );
}

export default Filter;

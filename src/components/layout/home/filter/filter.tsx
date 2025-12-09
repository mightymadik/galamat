import Facade from "@/app/real-estate/facade";

import "@/components/layout/real-estate/real-estate.scss";

interface IThisProps {
  houses: IProjectStage[];
  housesDataAdmin: IProjectData[];
}

function Filter({ houses, housesDataAdmin }: IThisProps) {

  return (
    <section>
      <div className="filter-wrapper">
        <div className="wrapper !pt-6">
          <Facade houses={houses} housesDataAdmin={housesDataAdmin} />
        </div>
      </div>
    </section>
  );
}

export default Filter;
import "./why-us.scss";
import { Fade } from "react-awesome-reveal";
import { useTranslate } from "@/hooks/useTranslate";

function WhyUs() {
  const $t = useTranslate();
  const dataWhyUs = [
    {
      title: $t("they_choose_us"),
      text: $t("the_company_is_deservedly"),
    },
    {
      title: $t("available_objects"),
      text: $t("everything_is_ready_for_occupancy"),
    },
    {
      title: $t("years_of_reliability"),
      text: $t("been_building_not_just_houses,_but_trust"),
    },
    {
      title: $t("families_have_chosen_us"),
      text: $t("our_homes_have_become_warm"),
    },
  ];

  return (
    <div className="why-us !mt-6 md:!mt-[80px]">
      <div className="wrapper">
        <h2 className="main-title">{$t("why_us_")}</h2>
        <div className="info">
          <div className="info-items">
            <Fade cascade direction="up" damping={0.4} triggerOnce>
              {dataWhyUs.map((item, index) => (
                <div key={`why-${index}`} className="info-item">
                  <h2>{item.title}</h2>
                  <h3>{item.text}</h3>
                </div>
              ))}
            </Fade>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhyUs;

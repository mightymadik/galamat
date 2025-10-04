"use client";

import React from "react";
import SendRequest from "@/components/layout/orleu-project/send-request";

function ContentOrleuEndSection() {
  return (
    <div className="section section4 section-end !pt-0 lg:!pt-[80px] mt-0 lg:mt-[100px]">
      <div className="info">
        <img src="img/sect3-bg.png" alt="" className="bg" />
        <img src="img/style.png" alt="" className="style" />
        <SendRequest />
      </div>
    </div>
  );
}

export default ContentOrleuEndSection;

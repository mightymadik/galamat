"use client";

import { Button } from "@heroui/react";

export default function WhyUsHero() {
  return (
    <section>
      <div
        className="min-h-[800px]"
        style={{
          background:
            "linear-gradient(0deg, rgba(28, 34, 49, 0.62) 0%, rgba(28, 34, 49, 0.62) 100%), url('/img/why-us-hero-poster.jpg') lightgray 50% / cover no-repeat",
        }}
      >
        <div className="relative z-10">
          <div className="wrapper">
            <div className="flex min-h-[800px] flex-col justify-center items-center gap-6">
              <img src="/img/logo-white.svg" alt="Why us hero logo" className="w-48 h-6 object-cover object-center" />
              <h1 className="text-white text-4xl font-bold text-center">
                Мы строим будущее <br /> вместе с сильной, уверенной командой
              </h1>
              <Button
                as="a"
                href="https://youtu.be/EfSq8N7PPXc?si=HRTGHk_abHe9tU9R"
                target="_blank"
                rel="noopener noreferrer"
                radius="lg"
                className="w-64 h-12 min-w-12 min-h-12 px-3.5 pt-3.5 pb-4 text-base font-medium bg-[#DB1D31] text-white"
              >
                Обзор компании
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
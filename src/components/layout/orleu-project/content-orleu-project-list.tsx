"use client";

import React from "react";

function ContentOrleuProjectList() {
  return (
    <div className="">
      <div className="section section6 !h-auto">
        <div className="improvement-wrap">
          <div className="title-wrap">
            <h2 className="main-title">Благоустройство двора</h2>
            <p>
              Благоустройство выполнено в современном европейском стиле: <br />
              ухоженные пешеходные маршруты, уютные зоны для отдыха с уличной
              мебелью и декоративной растительностью придают двору ощущение
              приватности и уюта — даже в центре мегаполиса.
            </p>
          </div>
          <div className="improvement-items">
            <div className="improvement-item">
              <span>
                Закрытый <br /> двор
              </span>
              <span
                className="bg"
                style={{ backgroundImage: "url(img/improvement-img1.png)" }}
              />
              <div className="hide-texts">
                <p>
                  Безопасное и комфортное место для отдыха и прогулок без машин.
                </p>
                <p>
                  Уютные дорожки, зелень и детские площадки создают атмосферу
                  уюта рядом с домом.
                </p>
              </div>
            </div>
            <div className="improvement-item">
              <span>
                Детские <br /> площадки
              </span>
              <span
                className="bg"
                style={{ backgroundImage: "url(img/improvement-img2.png)" }}
              ></span>
              <div className="hide-texts">
                <p>Современные детские площадки для игр и развития детей. </p>
                <p>
                  Уютная зона с мягким покрытием и игровым оборудованием радость
                  детям, спокойствие родителям.
                </p>
              </div>
            </div>
            <div className="improvement-item">
              <span>
                Ландшафтный <br /> авторский <br /> дизайн
              </span>
              <span
                className="bg"
                style={{ backgroundImage: "url(img/improvement-img3.png)" }}
              ></span>
              <div className="hide-texts">
                <p>
                  Авторский ландшафтный дизайн создаёт уникальное, продуманное
                  пространство, где природа гармонично сочетается с комфортом.
                </p>
              </div>
            </div>
            <div className="improvement-item">
              <span>Видеонаблюдение</span>
              <span
                className="bg"
                style={{ backgroundImage: "url(img/improvement-img4.png)" }}
              ></span>
              <div className="hide-texts">
                <p>
                  Система видеонаблюдения обеспечивает безопасность и контроль
                  территории жилого комплекса круглосуточно, создавая
                  спокойствие и защиту для вас и вашей семьи.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentOrleuProjectList;

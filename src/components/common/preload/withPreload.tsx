"use client";

import { useState, useEffect } from "react";
import PreloadComponent from "./preload";

const withPreload = (WrappedComponent: React.ComponentType<any>) => {
  return function WithPreload(props: any) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);

      if (document.readyState === "complete") {
        setIsLoading(false);
      } else {
        window.addEventListener("load", () => {
          setTimeout(() => setIsLoading(false), 1000);
        });
      }

      return () => clearTimeout(timer);
    }, []);

    return (
      <>
        {isLoading && <PreloadComponent />}
        <WrappedComponent {...props} />
      </>
    );
  };
};

export default withPreload;
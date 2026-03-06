// app/providers/ReduxProvider.tsx
"use client";

import { Provider } from "react-redux";
import { store } from "@/store";
import type { Store } from "@reduxjs/toolkit";
import { ToastProvider } from "@heroui/toast";

interface ReduxProviderProps {
  children: React.ReactNode;
  store?: Store;
}

export default function ReduxProvider({ children, store: appStore = store }: ReduxProviderProps) {
  return (
    <Provider store={appStore}>
      <ToastProvider placement="bottom-right" toastProps={{classNames: {
        base: "bg-[#f4f6fb]",
      }}} />
      {children}
    </Provider>
  );
}
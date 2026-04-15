// app/providers/ReduxProvider.tsx
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Provider } from "react-redux";
import { useSelector } from "react-redux";
import { store } from "@/store";
import type { RootState } from "@/store";
import type { Store } from "@reduxjs/toolkit";
import { ToastProvider } from "@heroui/toast";
import RopApprovalNotifier from "@/components/common/RopApprovalNotifier";
import QueueToast from "@/components/layout/profilePage/queueProfile/QueueToast";

interface ReduxProviderProps {
  children: React.ReactNode;
  store?: Store;
}

function GlobalQueueToast() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleOpenQueue = useCallback(() => {
    const documentId = user?.documentId;
    if (!documentId) return;
    router.push(`/profile/${documentId}?section=queue`);
  }, [router, user?.documentId]);

  return <QueueToast onOpenQueue={handleOpenQueue} />;
}

export default function ReduxProvider({ children, store: appStore = store }: ReduxProviderProps) {

  return (
    <Provider store={appStore}>
      <ToastProvider placement="bottom-right" toastProps={{classNames: {
        base: "bg-[#f4f6fb]",
      }}} />
      <RopApprovalNotifier />
      <GlobalQueueToast />
      {children}
    </Provider>
  );
}
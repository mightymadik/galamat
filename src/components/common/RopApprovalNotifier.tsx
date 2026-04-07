"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { addToast } from "@heroui/toast";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { RootState } from "@/store";

const REFRESH_INTERVAL_MS = 45_000;

type DealItem = {
  documentId: string;
  dealStatus: string;
};

export default function RopApprovalNotifier() {
  const router = useRouter();
  const role = useSelector((state: RootState) => state.auth.user?.role ?? "");
  const userDocumentId = useSelector((state: RootState) => state.auth.user?.documentId ?? "");
  const isRopOrAdmin = role === "rop" || role === "admin";
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isRopOrAdmin) return;

    const fetchDeals = async () => {
      try {
        const res = await fetch("/api/manager/deals", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const list: DealItem[] = Array.isArray(json?.deals) ? json.deals : [];
        const pending = list.filter((d) => d?.dealStatus === "Согласование РОП");
        const fresh = pending.filter((d) => d?.documentId && !seenRef.current.has(d.documentId));
        for (const d of pending) {
          if (d?.documentId) seenRef.current.add(d.documentId);
        }
        if (fresh.length === 0) return;

        const firstDealId = fresh[0].documentId;
        addToast({
          title: "Новая сделка на согласование",
          description:
            fresh.length === 1
              ? "Поступила новая сделка. Откройте и согласуйте."
              : `Поступило ${fresh.length} новых сделок на согласование.`,
          color: "success",
          endContent: (
            <Button
              size="sm"
              color="success"
              variant="flat"
              onPress={() =>
                router.push(
                  `${userDocumentId ? `/profile/${encodeURIComponent(userDocumentId)}` : "/profile"}?section=deals&deal=${encodeURIComponent(firstDealId)}`
                )
              }
            >
              Перейти
            </Button>
          ),
        });
      } catch {
        // ignore notification network errors
      }
    };

    fetchDeals();
    const timer = setInterval(fetchDeals, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isRopOrAdmin, router, userDocumentId]);

  return null;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { checkAuth } from "@/store/authThunks";

export default function ProfileRedirect() {
    const router = useRouter();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        dispatch(checkAuth() as any);
    }, [dispatch]);

    useEffect(() => {
        if (user) {
            const queueOnly =
                String(user.role ?? "").toLowerCase() === "external_manager";
            const qs = queueOnly ? "?section=queue" : "";
            router.replace(`/profile/${user.documentId}${qs}`);
            return;
        }
        const t = setTimeout(() => router.replace("/"), 1200);
        return () => clearTimeout(t);
    }, [user, router]);

    return null;
}

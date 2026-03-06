"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { checkAuth } from "@/store/authThunks";
import MenuProfile from "@/components/layout/profilePage/menuProfile/menuProfile";

export default function ProfileByDocumentId() {
    const router = useRouter();
    const params = useParams();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const documentId = params?.documentId as string | undefined;

    useEffect(() => {
        dispatch(checkAuth() as any);
    }, [dispatch]);

    useEffect(() => {
        if (documentId === undefined) return;
        if (user) {
            if (user.documentId !== documentId) {
                router.replace(`/profile/${user.documentId}`);
            }
            return;
        }
        const t = setTimeout(() => router.replace("/"), 1200);
        return () => clearTimeout(t);
    }, [user, documentId, router]);

    if (!documentId) return null;
    if (!user) return null;
    if (user.documentId !== documentId) return null;

    return (
        <div className="mt-[68px] py-[40px] lg:py-[60px]">
            <MenuProfile />
        </div>
    );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@heroui/react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { checkAuth } from "@/store/authThunks";
import ShowInfo from "./showInfo/showInfo";
import EditInfo from "./editInfo/editInfo";
import type { DocData } from "./types";
import { useTranslations } from "next-intl";

export default function PersonalInfo() {
  const dispatch = useDispatch();
  const t = useTranslations();
  const user = useSelector((state: RootState) => state.auth.user);

  const [isEditing, setIsEditing] = useState(false);
  const [docData, setDocData] = useState<DocData | null>(null);
  const [docLoading, setDocLoading] = useState(true);

  const fetchCustomerDoc = useCallback(async () => {
    setDocLoading(true);
    try {
      const res = await fetch("/api/profile/customer-doc", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.found && json?.data) {
        const d = json.data;
        setDocData({
          lastName: d.lastName ?? "",
          firstName: d.firstName ?? "",
          middleName: d.middleName ?? "",
          gender: d.gender ?? "",
          dateOfBirth: d.dateOfBirth ?? "",
          docNumber: d.docNumber ?? "",
          docIssuer: d.docIssuer ?? "",
          dateOfIssue: d.dateOfIssue ?? "",
          phone: d.phone ?? "",
          iin: d.iin,
        });
      } else {
        setDocData(null);
      }
    } catch {
      setDocData(null);
    } finally {
      setDocLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatch(checkAuth() as any);
  }, [dispatch]);

  useEffect(() => {
    fetchCustomerDoc();
  }, [fetchCustomerDoc]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
  };

  const handleSaved = () => {
    fetchCustomerDoc();
    setIsEditing(false);
  };

  const userPhone = user?.phone ?? "";

  return (
    <div className="flex w-full max-w-[976px] flex-col items-start gap-[32px]">
      <div className="flex flex-col items-start gap-[32px] self-stretch">
        <h1 className="text-[#000] [font-size:_clamp(24px,3vw,45px)] not-italic font-medium leading-[100%]">{t("personal_information")}</h1>
        <div className="flex w-full flex-col lg:flex-row items-end gap-[16px] self-stretch">
          <div className="flex w-full flex-col items-start flex-[1_0_0]">
            <div className="flex flex-col items-start self-stretch gap-[12px]">
              <span className="text-[#282D3C] text-[16px] not-italic font-normal leading-[20px]">{t("first_name")}</span>
              <div className="flex pt-[11px] pr-[12px] pb-[13px] pl-[16px] items-start gap-[4px] self-stretch rounded-[12px] bg-[#F4F6FB]">
                <span className="overflow-hidden text-[#282D3C] overflow-ellipsis text-[15px] not-italic font-normal leading-[20px]">{user?.name ?? "—"}</span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start flex-[1_0_0]">
            <div className="flex flex-col items-start self-stretch gap-[12px]">
              <span className="text-[#282D3C] text-[16px] not-italic font-normal leading-[20px]">{t("last_name")}</span>
              <div className="flex pt-[11px] pr-[12px] pb-[13px] pl-[16px] items-start gap-[4px] self-stretch rounded-[12px] bg-[#F4F6FB]">
                <span className="overflow-hidden text-[#282D3C] overflow-ellipsis text-[15px] not-italic font-normal leading-[20px]">{user?.surname ?? "—"}</span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start flex-[1_0_0]">
            <div className="flex flex-col items-start self-stretch gap-[12px]">
              <span className="text-[#282D3C] text-[16px] not-italic font-normal leading-[20px]">{t("phone")}</span>
              <div className="flex pt-[11px] pr-[12px] pb-[13px] pl-[16px] items-start gap-[4px] self-stretch rounded-[12px] bg-[#F4F6FB]">
                <span className="overflow-hidden text-[#282D3C] overflow-ellipsis text-[15px] not-italic font-normal leading-[20px]">{userPhone || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start gap-[12px] lg:gap-[32px] self-stretch">
        <h1 className="text-[#000] [font-size:_clamp(16px,3vw,24px)] not-italic font-normal leading-[18.423px]">{t("my_documents")}</h1>
        <div className="flex w-full lg:max-w-[480px] p-[16px] lg:p-[32px] flex-col items-start gap-[24px] self-stretch rounded-[24px] bg-[#F4F6FB]">
          <div className="flex items-center gap-[24px] self-stretch">
            <span className="flex-[1_0_0] text-[#000] [font-size:_clamp(16px,3vw,24px)] not-italic font-normal leading-[normal]">
              {t("identity_document")}
            </span>
            <Button className="flex min-w-[32px] min-h-[32px] p-[10px] justify-center items-center gap-[10px] [aspect-ratio:1/1] rounded-[18.5px] bg-[#FFF]" onPress={handleEditClick}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2.66699 14.6719H13.3337" stroke="#2655AF" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M9.25903 2.43674L9.75336 1.94241C10.5724 1.12336 11.9003 1.12336 12.7194 1.94241C13.5384 2.76145 13.5384 4.08938 12.7194 4.90842L12.225 5.40276M9.25903 2.43674C9.25903 2.43674 9.32082 3.48721 10.2477 4.41408C11.1746 5.34096 12.225 5.40276 12.225 5.40276M9.25903 2.43674L4.71436 6.9814C4.40654 7.28922 4.25263 7.44313 4.12027 7.61284C3.96413 7.81302 3.83026 8.02962 3.72104 8.2588C3.62845 8.45309 3.55962 8.65958 3.42196 9.07256L2.83862 10.8226M12.225 5.40276L7.68038 9.94742C7.37256 10.2552 7.21865 10.4091 7.04895 10.5415C6.84876 10.6977 6.63216 10.8315 6.40298 10.9407C6.2087 11.0333 6.0022 11.1022 5.58922 11.2398L3.83922 11.8232M3.83922 11.8232L3.41144 11.9657C3.20821 12.0335 2.98414 11.9806 2.83266 11.8291C2.68118 11.6776 2.62829 11.4536 2.69603 11.2503L2.83862 10.8226M3.83922 11.8232L2.83862 10.8226" stroke="#2655AF" strokeWidth="1.5" />
              </svg>
            </Button>
          </div>
          {docLoading ? (
            <p className="text-[#000] text-[16px] opacity-60">{t("loading")}</p>
          ) : !isEditing ? (
            <ShowInfo docData={docData} />
          ) : (
            <EditInfo
              docData={docData}
              userPhone={userPhone}
              onClose={handleCloseEdit}
              onSaved={handleSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
}

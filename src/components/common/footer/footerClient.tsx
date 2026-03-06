"use client";

import Link from "next/link";
import type { Footer, AvailableProjects } from "@/types/footer";
import type { SocialMediaData } from "@/types/mainPage";
import { useTranslations } from "next-intl";
import Image from "next/image";

type FooterUIItem = {
    id: number;
    text: string;
    link: string;
};

type FooterSection = {
    id: number;
    heading: string;
    headingLink?: string;
    items: FooterUIItem[];
};

export default function FooterClient({
    data,
    socialMedia,
    availableProjects,
}: {
    data: Footer;
    socialMedia: SocialMediaData[];
    availableProjects: AvailableProjects[];
}) {
    const t = useTranslations();

    const footerData: FooterSection[] = data.footerItem.map(section => ({
        id: section.id,
        heading: section.footerItemTitle,
        headingLink: section.footerItemLink,
        items: section.footerSubItem?.map(sub => ({
            id: sub.id,
            text: sub.footerSubtitle,
            link: sub.footerSublink,
        })) ?? [],
    }));

    const projectsSection: FooterSection = {
        id: 9999,
        heading: t("footer_projects"),
        items: availableProjects.map(project => ({
            id: project.id,
            text: project.projectName,
            link: `/project/${project.projectSlug}`,
        })),
    };

    const allSections = [...footerData, projectsSection];

    const columns: FooterSection[][] = [];
    for (let i = 0; i < allSections.length; i += 2) {
        columns.push(allSections.slice(i, i + 2));
    }

    return (
        <footer className="w-full hidden lg:flex flex-col items-start mt-auto bg-gray-100">
            <div className="wrapper flex justify-between xl:justify-end items-start self-stretch p-4">
                {/* Левая часть */}
                <div className="flex flex-col items-start w-[250px]">
                    <div className="flex justify-center items-center h-5 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="163" height="20" viewBox="0 0 163 20" fill="none"> <path fillRule="evenodd" clipRule="evenodd" d="M8.59231 0.200195H0V18.8737H8.59231V0.200195ZM30.0881 0.200195H21.4957V18.8737H30.0881V0.200195Z" fill="#132C5E" /> <path d="M45.9299 8.20962H55.3533V10.0573C55.3533 12.742 54.4923 14.9244 52.7703 16.5987C51.0422 18.249 48.8239 19.074 46.0913 19.074C43.2033 19.074 40.7996 18.1593 38.8862 16.3356C37.0206 14.5059 36.0879 12.2577 36.0879 9.57293C36.0879 6.88821 37.0206 4.6399 38.8862 2.77435C40.7518 0.926734 43.0718 0 45.8282 0C47.5563 0 49.1528 0.388622 50.6057 1.15996C52.0408 1.90737 53.1888 2.91795 54.02 4.21547L49.9719 6.48764C49.5952 5.90765 49.0391 5.45318 48.3096 5.10638C47.5802 4.74762 46.773 4.58012 45.888 4.58012C44.4111 4.58012 43.2033 5.04657 42.2586 5.98533C41.3138 6.94202 40.8355 8.14987 40.8355 9.59687C40.8355 11.0439 41.3019 12.2158 42.2227 13.1725C43.1674 14.1531 44.4889 14.6434 46.1691 14.6434C48.3456 14.6434 49.7746 13.8422 50.4682 12.2397H45.9299V8.21561V8.20962ZM74.2421 18.6854H69.0879L68.2926 16.0426H62.0681L61.2729 18.6854H56.0948L62.2654 0.400569H68.0774L74.248 18.6854H74.2421ZM65.1594 5.80592L63.2939 12.0245H67.0609L65.1594 5.80592ZM81.2499 0.400569V14.171H87.6896V18.6854H76.4784V0.400569H81.2439H81.2499ZM107.296 18.6854H102.141L101.346 16.0426H95.1219L94.3267 18.6854H89.1486L95.3192 0.400569H101.131L107.302 18.6854H107.296ZM98.2133 5.80592L96.3477 12.0245H100.115L98.2133 5.80592ZM123.637 0.400569H128.265V18.6854H123.637V8.8315L119.213 16.1741H118.746L114.345 8.85544V18.6854H109.681V0.400569H114.345L118.973 8.20962L123.637 0.400569ZM148.715 18.6854H143.572L142.765 16.0426H136.553L135.757 18.6854H130.579L136.738 0.400569H142.562L148.721 18.6854H148.715ZM139.644 5.80592L137.778 12.0245H141.545L139.644 5.80592ZM148.44 0.400569H162.449V4.915H157.827V18.6854H153.056V4.915H148.434V0.400569H148.44Z" fill="#132C5E" /> <path fillRule="evenodd" clipRule="evenodd" d="M19.4888 0.417969H11.0459V18.1578H19.4888V0.417969Z" fill="#DB1D31" /> </svg>
                    </div>

                    <div className="flex flex-col gap-3">
                        <p className="text-gray-800 text-sm font-medium">{t("we_on_social_media")}</p>
                        <div className="flex gap-2">
                            {socialMedia?.map(media => (
                                <Link
                                    key={media.id}
                                    target="_blank"
                                    href={media.socialMediaLink}
                                    className="flex w-[44px] h-[44px] justify-center items-center p-[13px]"
                                >
                                    <Image
                                        src={media.socialMediaIcon}
                                        alt={media.socialMediaTitle}
                                        width={44}
                                        height={44}
                                    />
                                </Link>
                            ))}
                        </div>

                        <div className="flex flex-col gap-1 mt-2">
                            {data.footerDocuments.map(doc => (
                                <Link key={doc.id} href={doc.footerDocumentsLink || "/"}>
                                    <p className="text-gray-600 text-sm">{doc.footerDocumentsTitle}</p>
                                </Link>
                            ))}
                        </div>

                        <p className="mt-2 text-gray-600 text-xs">{data.footerRights}</p>
                    </div>
                </div>

                {/* Правая часть */}
                <div className="flex flex-1 justify-end gap-6">
                    {columns.map((column, colIndex) => (
                        <div key={colIndex} className="flex flex-col gap-4 w-56">
                            {column.map(section => (
                                <div key={section.id} className="flex flex-col gap-2">
                                    {section.headingLink ? (
                                        <Link href={section.headingLink} className="text-gray-800 text-sm font-medium">
                                            {section.heading}
                                        </Link>
                                    ) : (
                                        <p className="text-gray-800 text-sm font-medium">{section.heading}</p>
                                    )}
                                    {section.items.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            {section.items.map(item => (
                                                <Link key={item.id} href={item.link || "#"} className="text-gray-600 text-sm">
                                                    {item.text}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </footer>
    );
}
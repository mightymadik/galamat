export interface FooterDocuments {
    id: number;
    footerDocumentsTitle: string;
    footerDocumentsLink: string;
}

export interface FooterSubItem {
    id: number;
    footerSubtitle: string;
    footerSublink: string;
}

export interface FooterItem {
    id: number;
    footerItemTitle: string;
    footerItemLink: string;
    footerSubItem: FooterSubItem[];
}

export interface Footer {
    footerRights: string;
    footerDocuments: FooterDocuments[];
    footerItem: FooterItem[];
}

export interface AvailableProjects {
    id: number;
    projectName: string;
    projectSlug: string;
}
import GalleryBlockClient from "./galleryBlockClient";
import { ProjectComplexGalleryData, hasGalleryContent } from "@/types/projectPage";

export default function GalleryBlock({ gallery }: { gallery?: ProjectComplexGalleryData | null }) {
    if (!gallery || !hasGalleryContent(gallery)) return null;
    return <GalleryBlockClient gallery={gallery} />;
}

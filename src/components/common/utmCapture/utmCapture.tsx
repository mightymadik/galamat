"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { captureUtmParams } from "@/lib/utm";

/**
 * Component that captures UTM parameters from URL on first visit
 * and stores them in localStorage
 */
export default function UtmCapture() {
    const searchParams = useSearchParams();

    useEffect(() => {
        // Capture UTM parameters from URL if present
        captureUtmParams();
    }, [searchParams]);

    return null; // This component doesn't render anything
}

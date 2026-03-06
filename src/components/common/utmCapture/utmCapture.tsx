"use client";

import { useEffect } from "react";
import { captureUtmParams } from "@/lib/utm";

/**
 * Component that captures UTM parameters from URL on first visit
 * and stores them in localStorage
 */
export default function UtmCapture() {
    useEffect(() => {
        // Capture UTM parameters from URL if present
        captureUtmParams();
    }, []);

    return null; // This component doesn't render anything
}

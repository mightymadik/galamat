/**
 * UTM parameters utility functions
 * Captures UTM parameters from URL and stores them in localStorage
 */

export interface UtmParams {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
}

const UTM_STORAGE_KEY = "galamat_utm_params";
const UTM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function canUseDom(): boolean {
    return typeof window !== "undefined" && typeof document !== "undefined";
}

function setCookie(name: string, value: string, expiresAt: Date): void {
    if (!canUseDom()) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Expires=${expiresAt.toUTCString()}; Path=/; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
    if (!canUseDom()) return null;
    const encodedName = encodeURIComponent(name) + "=";
    const parts = document.cookie.split("; ");
    for (const part of parts) {
        if (part.startsWith(encodedName)) {
            return decodeURIComponent(part.slice(encodedName.length));
        }
    }
    return null;
}

function deleteCookie(name: string): void {
    if (!canUseDom()) return;
    document.cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
}

type UtmStorageData = {
    params: UtmParams;
    expiry: string; // ISO string
};

function saveUtmStorageData(storageData: UtmStorageData): void {
    if (typeof window === "undefined") return;
    const serialized = JSON.stringify(storageData);

    try {
        localStorage.setItem(UTM_STORAGE_KEY, serialized);
    } catch {
        // ignore and fall back to cookie below
    }

    try {
        setCookie(UTM_STORAGE_KEY, serialized, new Date(storageData.expiry));
    } catch {
        // ignore
    }
}

function readUtmStorageData(): UtmStorageData | null {
    if (typeof window === "undefined") return null;

    // 1) localStorage first
    try {
        const raw = localStorage.getItem(UTM_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as UtmStorageData;
    } catch {
        // ignore
    }

    // 2) fallback to cookie
    try {
        const raw = getCookie(UTM_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as UtmStorageData;
    } catch {
        // ignore
    }

    return null;
}

function clearUtmStorageData(): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(UTM_STORAGE_KEY);
    } catch {
        // ignore
    }
    try {
        deleteCookie(UTM_STORAGE_KEY);
    } catch {
        // ignore
    }
}

/**
 * Captures UTM parameters from current URL and stores them in localStorage
 * Only stores if UTM parameters are present in URL
 */
export function captureUtmParams(): UtmParams | null {
    if (typeof window === "undefined") return null;

    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: UtmParams = {};

    const utmKeys: (keyof UtmParams)[] = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
    ];

    let hasUtmParams = false;
    utmKeys.forEach((key) => {
        const value = urlParams.get(key);
        if (value) {
            utmParams[key] = value;
            hasUtmParams = true;
        }
    });

    if (hasUtmParams) {
        const expiryDate = new Date(Date.now() + UTM_TTL_MS);

        const storageData: UtmStorageData = {
            params: utmParams,
            expiry: expiryDate.toISOString(),
        };

        saveUtmStorageData(storageData);
        return utmParams;
    }

    return utmParams;
}

/**
 * Retrieves stored UTM parameters from localStorage
 * Returns null if expired or not found
 */
export function getStoredUtmParams(): UtmParams | null {
    if (typeof window === "undefined") return null;

    const storageData = readUtmStorageData();
    if (!storageData) return null;

    try {
        const expiryDate = new Date(storageData.expiry);
        if (Number.isNaN(expiryDate.getTime())) {
            clearUtmStorageData();
            return null;
        }

        // Check if expired
        if (Date.now() > expiryDate.getTime()) {
            clearUtmStorageData();
            return null;
        }

        return storageData.params || null;
    } catch {
        clearUtmStorageData();
        return null;
    }
}

/**
 * Clears stored UTM parameters from localStorage
 */
export function clearUtmParams(): void {
    if (typeof window === "undefined") return;
    clearUtmStorageData();
}

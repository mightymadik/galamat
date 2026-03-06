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

const UTM_STORAGE_KEY = 'galamat_utm_params';
const UTM_EXPIRY_DAYS = 30;

/**
 * Captures UTM parameters from current URL and stores them in localStorage
 * Only stores if UTM parameters are present in URL
 */
export function captureUtmParams(): UtmParams | null {
    if (typeof window === 'undefined') return null;

    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: UtmParams = {};

    const utmKeys: (keyof UtmParams)[] = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
    ];

    let hasUtmParams = false;
    utmKeys.forEach((key) => {
        const value = urlParams.get(key);
        if (value) {
            utmParams[key] = value;
            hasUtmParams = true;
        }
    });

    // Only store if we have at least one UTM parameter
    if (hasUtmParams) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + UTM_EXPIRY_DAYS);

        const storageData = {
            params: utmParams,
            expiry: expiryDate.toISOString(),
        };

        try {
            localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(storageData));
            return utmParams;
        } catch (error) {
            console.error('Failed to save UTM parameters to localStorage:', error);
        }
    }

    return hasUtmParams ? utmParams : null;
}

/**
 * Retrieves stored UTM parameters from localStorage
 * Returns null if expired or not found
 */
export function getStoredUtmParams(): UtmParams | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(UTM_STORAGE_KEY);
        if (!stored) return null;

        const storageData = JSON.parse(stored);
        const expiryDate = new Date(storageData.expiry);

        // Check if expired
        if (new Date() > expiryDate) {
            localStorage.removeItem(UTM_STORAGE_KEY);
            return null;
        }

        return storageData.params || null;
    } catch (error) {
        console.error('Failed to retrieve UTM parameters from localStorage:', error);
        return null;
    }
}

/**
 * Clears stored UTM parameters from localStorage
 */
export function clearUtmParams(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(UTM_STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear UTM parameters from localStorage:', error);
    }
}

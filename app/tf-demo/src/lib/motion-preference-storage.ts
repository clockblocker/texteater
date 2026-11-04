/*
 * The motion preference as stored, with no Effect: `main.tsx` reads it
 * before React mounts, and the entry chunk must stay free of Effect. The
 * atom in `motion-preference-atoms.ts` writes the same key in the same
 * encoding, JSON, so the two always agree.
 */

export type MotionPreference = "respect" | "ignore";

export const MOTION_PREFERENCES = ["respect", "ignore"] as const;
export const MOTION_PREFERENCE_STORAGE_KEY = "tf-demo-motion-preference";
const DEFAULT_MOTION_PREFERENCE: MotionPreference = "respect";

export function isMotionPreference(value: unknown): value is MotionPreference {
	return MOTION_PREFERENCES.some((preference) => preference === value);
}

/**
 * The preference a stored entry holds: the JSON string the atom writes, or
 * "respect" when there is no entry or it is anything else.
 */
export function parseMotionPreference(stored: string | null): MotionPreference {
	if (stored === null) return DEFAULT_MOTION_PREFERENCE;
	try {
		const value: unknown = JSON.parse(stored);
		return isMotionPreference(value) ? value : DEFAULT_MOTION_PREFERENCE;
	} catch {
		return DEFAULT_MOTION_PREFERENCE;
	}
}

export function readMotionPreference(
	storage: Pick<Storage, "getItem"> | null = browserStorage(),
): MotionPreference {
	try {
		return parseMotionPreference(
			storage?.getItem(MOTION_PREFERENCE_STORAGE_KEY) ?? null,
		);
	} catch {
		return DEFAULT_MOTION_PREFERENCE;
	}
}

/** Sets the root attribute `index.css` reads to hold motion still or not. */
export function applyMotionPreference(
	preference: MotionPreference,
	documentOverride?: Document,
): void {
	const target =
		documentOverride ?? (typeof document === "undefined" ? null : document);
	if (!target) return;
	target.documentElement.dataset.motionPreference = preference;
}

/** Applies the stored preference before the first paint. */
export function initializeMotionPreference(documentOverride?: Document) {
	const preference = readMotionPreference();
	applyMotionPreference(preference, documentOverride);
	return preference;
}

function browserStorage(): Pick<Storage, "getItem"> | null {
	return typeof window === "undefined" ? null : window.localStorage;
}

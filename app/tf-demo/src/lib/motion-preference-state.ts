export type MotionPreference = "respect" | "ignore";

export const MOTION_PREFERENCE_STORAGE_KEY = "tf-demo-motion-preference";
const MOTION_PREFERENCES: readonly MotionPreference[] = ["respect", "ignore"];

export function isMotionPreference(
	value: string | null,
): value is MotionPreference {
	return (
		value !== null && MOTION_PREFERENCES.includes(value as MotionPreference)
	);
}

export function readMotionPreference(
	storage: Pick<Storage, "getItem"> | null = browserStorage(),
): MotionPreference {
	try {
		const stored = storage?.getItem(MOTION_PREFERENCE_STORAGE_KEY) ?? null;
		return isMotionPreference(stored) ? stored : "respect";
	} catch {
		return "respect";
	}
}

export function applyMotionPreference(
	preference: MotionPreference,
	documentOverride?: Document,
): void {
	const target =
		documentOverride ?? (typeof document === "undefined" ? null : document);
	if (!target) return;
	target.documentElement.dataset.motionPreference = preference;
}

export function initializeMotionPreference(documentOverride?: Document) {
	const preference = readMotionPreference();
	applyMotionPreference(preference, documentOverride);
	return preference;
}

function browserStorage(): Pick<Storage, "getItem"> | null {
	return typeof window === "undefined" ? null : window.localStorage;
}

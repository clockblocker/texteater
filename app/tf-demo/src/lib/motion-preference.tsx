import * as React from "react";

export type MotionPreference = "respect" | "ignore";

const STORAGE_KEY = "tf-demo-motion-preference";
const MOTION_PREFERENCES: readonly MotionPreference[] = ["respect", "ignore"];

type MotionPreferenceContextValue = {
	preference: MotionPreference;
	setPreference(preference: MotionPreference): void;
};

const MotionPreferenceContext =
	React.createContext<MotionPreferenceContextValue | null>(null);

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
		const stored = storage?.getItem(STORAGE_KEY) ?? null;
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

export function MotionPreferenceProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [preference, setPreferenceState] =
		React.useState<MotionPreference>(readMotionPreference);

	const setPreference = React.useCallback((next: MotionPreference) => {
		writeMotionPreference(next);
		applyMotionPreference(next);
		setPreferenceState(next);
	}, []);

	React.useEffect(() => {
		applyMotionPreference(preference);
	}, [preference]);

	React.useEffect(() => {
		const handleStorageChange = (event: StorageEvent) => {
			if (event.storageArea !== localStorage) return;
			if (event.key !== STORAGE_KEY) return;
			const next = isMotionPreference(event.newValue)
				? event.newValue
				: "respect";
			applyMotionPreference(next);
			setPreferenceState(next);
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);

	const value = React.useMemo(
		() => ({ preference, setPreference }),
		[preference, setPreference],
	);

	return (
		<MotionPreferenceContext.Provider value={value}>
			{children}
		</MotionPreferenceContext.Provider>
	);
}

export function useMotionPreference() {
	const context = React.useContext(MotionPreferenceContext);
	if (!context) {
		throw new Error(
			"useMotionPreference must be used within MotionPreferenceProvider.",
		);
	}
	return context;
}

function writeMotionPreference(preference: MotionPreference): void {
	try {
		localStorage.setItem(STORAGE_KEY, preference);
	} catch {
		// Storage can be unavailable in privacy modes; the live preference still applies.
	}
}

function browserStorage(): Pick<Storage, "getItem"> | null {
	return typeof window === "undefined" ? null : window.localStorage;
}

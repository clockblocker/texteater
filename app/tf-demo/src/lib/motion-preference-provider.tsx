import * as React from "react";
import {
	applyMotionPreference,
	isMotionPreference,
	MOTION_PREFERENCE_STORAGE_KEY,
	type MotionPreference,
	readMotionPreference,
} from "./motion-preference-state";

type MotionPreferenceContextValue = {
	preference: MotionPreference;
	setPreference(preference: MotionPreference): void;
};

const MotionPreferenceContext =
	React.createContext<MotionPreferenceContextValue | null>(null);

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
			if (event.key !== MOTION_PREFERENCE_STORAGE_KEY) return;
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
		localStorage.setItem(MOTION_PREFERENCE_STORAGE_KEY, preference);
	} catch {
		// Storage can be unavailable in privacy modes; the live preference still applies.
	}
}

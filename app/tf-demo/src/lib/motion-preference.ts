import { useAtom, useAtomMount } from "@effect/atom-react";
import { motionPreferenceAtom } from "./motion-preference-atoms";
import type { MotionPreference } from "./motion-preference-storage";

/** The motion preference, and a setter that stores and applies it. */
export function useMotionPreference(): {
	readonly preference: MotionPreference;
	readonly setPreference: (preference: MotionPreference) => void;
} {
	const [preference, setPreference] = useAtom(motionPreferenceAtom);
	return { preference, setPreference };
}

/**
 * Keeps the motion preference atom mounted for the app's lifetime, so a
 * change in another tab reaches the root attribute on every page, including
 * those where nothing reads the preference.
 */
export function MotionPreferenceSync(): null {
	useAtomMount(motionPreferenceAtom);
	return null;
}

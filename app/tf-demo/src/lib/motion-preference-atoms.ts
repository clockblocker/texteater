import * as Atom from "effect/reactivity/Atom";
import * as Schema from "effect/Schema";
import { localStorageAtom } from "./local-storage-atoms";
import {
	applyMotionPreference,
	MOTION_PREFERENCE_STORAGE_KEY,
	MOTION_PREFERENCES,
	type MotionPreference,
	parseMotionPreference,
} from "./motion-preference-storage";

const storedMotionPreferenceAtom = localStorageAtom({
	key: MOTION_PREFERENCE_STORAGE_KEY,
	schema: Schema.Literals(MOTION_PREFERENCES),
	defaultValue: (): MotionPreference => "respect",
});

/**
 * Whether tf-demo respects the system's Reduce Motion or ignores it, kept in
 * localStorage. Every value it takes is applied to the root attribute that
 * `index.css` reads. kvs hears no other tab, so the read owns a `storage`
 * listener, for as long as the atom has readers, that takes another tab's
 * change into this one.
 */
export const motionPreferenceAtom = Atom.writable(
	(get): MotionPreference => {
		const onStorage = (event: StorageEvent) => {
			if (event.storageArea !== localStorage) return;
			if (event.key !== MOTION_PREFERENCE_STORAGE_KEY) return;
			get.set(
				storedMotionPreferenceAtom,
				parseMotionPreference(event.newValue),
			);
		};
		window.addEventListener("storage", onStorage);
		get.addFinalizer(() =>
			window.removeEventListener("storage", onStorage),
		);
		const preference = get(storedMotionPreferenceAtom);
		applyMotionPreference(preference);
		return preference;
	},
	(ctx, preference: MotionPreference) =>
		ctx.set(storedMotionPreferenceAtom, preference),
);

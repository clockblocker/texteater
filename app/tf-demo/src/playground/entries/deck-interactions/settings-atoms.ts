import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { localStorageAtom } from "@/lib/local-storage-atoms";
import { VARIANT_KEYS, type VariantKey } from "./knobs";

const REDUCED_MOTION = ["system", "on", "off"] as const;
export type ReducedMotion = (typeof REDUCED_MOTION)[number];

export const TIME_SCALES = [0.25, 0.5, 1] as const;
export type TimeScale = (typeof TIME_SCALES)[number];

/** A field that falls back to its default alone when it does not decode. */
function lenient<S extends Schema.Codec<unknown, unknown>>(schema: S) {
	return Schema.optionalKey(
		schema.pipe(Schema.catchDecoding(() => Effect.succeedNone)),
	);
}

const StoredSettings = Schema.Struct({
	variant: lenient(Schema.Literals(VARIANT_KEYS)),
	reducedMotion: lenient(Schema.Literals(REDUCED_MOTION)),
	timeScale: lenient(Schema.Literals(TIME_SCALES)),
	rtl: lenient(Schema.Boolean),
	showProjection: lenient(Schema.Boolean),
	knobs: lenient(
		Schema.Record(
			Schema.String,
			Schema.Record(
				Schema.String,
				Schema.Union([Schema.Finite, Schema.Boolean, Schema.String]),
			),
		),
	),
});
type StoredSettings = typeof StoredSettings.Type;

export type Settings = {
	readonly variant: VariantKey;
	/** Defaults to off, so full motion shows even under the system's reduce. */
	readonly reducedMotion: ReducedMotion;
	readonly timeScale: TimeScale;
	readonly rtl: boolean;
	/** An evaluator's mark on the surface, so it starts off (ADR 0001). */
	readonly showProjection: boolean;
	readonly knobs: Readonly<
		Record<string, Readonly<Record<string, number | boolean | string>>>
	>;
};

export function settingsOf(stored: StoredSettings): Settings {
	return {
		variant: stored.variant ?? "table",
		reducedMotion: stored.reducedMotion ?? "off",
		timeScale: stored.timeScale ?? 1,
		rtl: stored.rtl ?? false,
		showProjection: stored.showProjection ?? false,
		knobs: stored.knobs ?? {},
	};
}

/**
 * The prototype's inspector state, kept across reloads. `localStorageAtom`
 * already reads a throwing or refusing Storage as the default and keeps a
 * refused write for this page.
 */
export const deckInteractionSettingsAtom = localStorageAtom({
	key: "tf-demo:playground:deck-interactions:settings-v1",
	schema: StoredSettings,
	defaultValue: () => ({}),
});

/**
 * Every variant's knobs: its defaults (the spec's values), the range each
 * number may take, and how a stored value is read back. A stored value of
 * the wrong type or out of range falls back to its default, alone.
 */

import { SWIPE_DEFAULTS, SWIPE_KNOBS, type SwipeKnobs } from "./swipe-knobs";

export const VARIANT_KEYS = ["swipe"] as const;
export type VariantKey = (typeof VARIANT_KEYS)[number];

type NumberKnob<K extends string> = {
	readonly kind: "number";
	readonly key: K;
	readonly label: string;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly unit?: string;
};
type ToggleKnob<K extends string> = {
	readonly kind: "toggle";
	readonly key: K;
	readonly label: string;
};
type ChoiceKnob<K extends string> = {
	readonly kind: "choice";
	readonly key: K;
	readonly label: string;
	readonly options: readonly string[];
};

/** Any variant's knob, as the inspector draws it. */
export type AnyKnob =
	| NumberKnob<string>
	| ToggleKnob<string>
	| ChoiceKnob<string>;

export type KnobsOf = {
	readonly swipe: SwipeKnobs;
};

export const DEFAULTS: KnobsOf = {
	swipe: SWIPE_DEFAULTS,
};

export const KNOBS: { readonly [K in VariantKey]: readonly AnyKnob[] } = {
	swipe: SWIPE_KNOBS,
};

function validValue(knob: AnyKnob, value: unknown): boolean {
	switch (knob.kind) {
		case "number":
			return (
				typeof value === "number" &&
				Number.isFinite(value) &&
				value >= knob.min &&
				value <= knob.max
			);
		case "toggle":
			return typeof value === "boolean";
		case "choice":
			return typeof value === "string" && knob.options.includes(value);
	}
}

/** A variant's knobs: the stored ones that are still valid, else defaults. */
export function readKnobs<K extends VariantKey>(
	variant: K,
	stored: Readonly<Record<string, unknown>> | undefined,
): KnobsOf[K] {
	const values: Record<string, unknown> = { ...DEFAULTS[variant] };
	for (const knob of KNOBS[variant]) {
		const value = stored?.[knob.key];
		if (validValue(knob, value)) values[knob.key] = value;
	}
	return values as KnobsOf[K];
}

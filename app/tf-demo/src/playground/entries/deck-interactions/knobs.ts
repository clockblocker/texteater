/**
 * Every variant's knobs: its defaults (the spec's values), the range each
 * number may take, and how a stored value is read back. A stored value of
 * the wrong type or out of range falls back to its default, alone.
 */

export const VARIANT_KEYS = ["table", "swipe"] as const;
export type VariantKey = (typeof VARIANT_KEYS)[number];

const SHOW_TARGETS = ["always", "pickup", "near"] as const;
type ShowTargets = (typeof SHOW_TARGETS)[number];

type KnobValue = number | boolean | string;
type KnobValues = Readonly<Record<string, KnobValue>>;

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

type Knob<V extends KnobValues> = {
	[K in keyof V & string]: V[K] extends number
		? NumberKnob<K>
		: V[K] extends boolean
			? ToggleKnob<K>
			: ChoiceKnob<K>;
}[keyof V & string];

function num<K extends string>(
	key: K,
	label: string,
	min: number,
	max: number,
	step: number,
	unit?: string,
): NumberKnob<K> {
	return { kind: "number", key, label, min, max, step, unit };
}

function toggle<K extends string>(key: K, label: string): ToggleKnob<K> {
	return { kind: "toggle", key, label };
}

const FLICK = num("flickSpeed", "Flick speed", 0.1, 3, 0.05, "px/ms");

/** B: the fan, the lift, the lean, the targets' pull and the return. */
const TABLE_DEFAULTS = {
	fanDeg: 4,
	hoverLift: 6,
	flickSpeed: 0.5,
	liftScale: 1.06,
	pressLift: 0.4,
	followStiffness: 1400,
	tiltGain: 6,
	tiltMax: 10,
	reflowStaggerMs: 24,
	targetSize: 64,
	targetStaggerMs: 30,
	magnetRadius: 48,
	slotReach: 96,
	magnetStrength: 0.35,
	hopPerPx: 0.12,
	arcHeight: 40,
	reducedReturnMs: 280,
	commitPulse: true,
	showTargets: "pickup" as ShowTargets,
};
export type TableKnobs = typeof TABLE_DEFAULTS;

const TABLE_KNOBS: readonly Knob<TableKnobs>[] = [
	num("fanDeg", "Fan", 0, 15, 0.5, "°"),
	num("hoverLift", "Hover lift", 0, 24, 1, "px"),
	FLICK,
	num("liftScale", "Lift scale", 1, 1.2, 0.01),
	num("pressLift", "Press lift", 0, 1, 0.05),
	num("followStiffness", "Follow stiffness", 100, 2000, 20),
	num("tiltGain", "Tilt gain", 0, 20, 0.5, "°·ms/px"),
	num("tiltMax", "Tilt max", 0, 30, 1, "°"),
	num("reflowStaggerMs", "Reflow stagger", 0, 120, 4, "ms"),
	num("targetSize", "Target size", 32, 160, 4, "px"),
	num("targetStaggerMs", "Target stagger", 0, 120, 5, "ms"),
	num("magnetRadius", "Magnet radius", 0, 160, 4, "px"),
	num("slotReach", "Slot reach", 24, 240, 4, "px"),
	num("magnetStrength", "Magnet strength", 0, 1, 0.05),
	num("hopPerPx", "Return hop per px", 0, 0.5, 0.01),
	num("arcHeight", "Return hop max", 0, 160, 4, "px"),
	num("reducedReturnMs", "Reduced return", 80, 480, 10, "ms"),
	toggle("commitPulse", "Commit pulse"),
	{
		kind: "choice",
		key: "showTargets",
		label: "Show targets",
		options: SHOW_TARGETS,
	},
];

const SWIPE_DEFAULTS = {
	detent: 96,
	resistance: 0.15,
	panelLabels: true,
	axisLock: 10,
	flickSpeed: 0.5,
};
export type SwipeKnobs = typeof SWIPE_DEFAULTS;

const SWIPE_KNOBS: readonly Knob<SwipeKnobs>[] = [
	num("detent", "Detent", 40, 200, 2, "px"),
	num("resistance", "Resistance", 0, 0.6, 0.01),
	toggle("panelLabels", "Panel labels"),
	num("axisLock", "Axis lock", 2, 40, 1, "px"),
	FLICK,
];

export type KnobsOf = {
	readonly table: TableKnobs;
	readonly swipe: SwipeKnobs;
};

export const DEFAULTS: KnobsOf = {
	table: TABLE_DEFAULTS,
	swipe: SWIPE_DEFAULTS,
};

export const KNOBS: { readonly [K in VariantKey]: readonly AnyKnob[] } = {
	table: TABLE_KNOBS,
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

/**
 * Every variant's knobs: its defaults (the spec's values), the range each
 * number may take, and how a stored value is read back. A stored value of
 * the wrong type or out of range falls back to its default, alone.
 */

export const VARIANT_KEYS = [
	"stack",
	"table",
	"wallet",
	"swipe",
	"whole",
] as const;
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

const STACK_DEFAULTS = {
	threshold: 110,
	flickSpeed: 0.5,
	tiltPerPx: 0.05,
	velocityTiltGain: 4,
	tiltMax: 12,
	hinge: true,
	revealScale: 0.96,
	followStaggerMs: 40,
	flyStiffness: 360,
	flyDamping: 38,
	stamp: true,
};
export type StackKnobs = typeof STACK_DEFAULTS;

const STACK_KNOBS: readonly Knob<StackKnobs>[] = [
	num("threshold", "Threshold", 40, 240, 2, "px"),
	FLICK,
	num("tiltPerPx", "Tilt per px", 0, 0.2, 0.005, "°"),
	num("velocityTiltGain", "Velocity tilt gain", 0, 15, 0.5, "°·ms/px"),
	num("tiltMax", "Tilt max", 0, 30, 1, "°"),
	toggle("hinge", "Grab hinge"),
	num("revealScale", "Reveal scale", 0.8, 1, 0.01),
	num("followStaggerMs", "Follow stagger", 0, 200, 5, "ms"),
	num("flyStiffness", "Fly stiffness", 50, 1500, 10),
	num("flyDamping", "Fly damping", 1, 120, 1),
	toggle("stamp", "Stamp"),
];

/** B's targets, which E's hold-carry shares. */
const TARGET_DEFAULTS = {
	targetSize: 64,
	magnetRadius: 48,
	magnetStrength: 0.35,
	followStiffness: 900,
	arcHeight: 40,
	commitPulse: true,
	showTargets: "pickup" as ShowTargets,
};
export type TargetKnobs = typeof TARGET_DEFAULTS;

const TARGET_KNOBS: readonly Knob<TargetKnobs>[] = [
	num("targetSize", "Target size", 32, 160, 4, "px"),
	num("magnetRadius", "Magnet radius", 0, 160, 4, "px"),
	num("magnetStrength", "Magnet strength", 0, 1, 0.05),
	num("followStiffness", "Follow stiffness", 100, 2000, 20),
	num("arcHeight", "Arc height", 0, 160, 4, "px"),
	toggle("commitPulse", "Commit pulse"),
	{
		kind: "choice",
		key: "showTargets",
		label: "Show targets",
		options: SHOW_TARGETS,
	},
];

const TABLE_DEFAULTS = {
	fanDeg: 4,
	hoverLift: 6,
	flickSpeed: 0.5,
	...TARGET_DEFAULTS,
};
export type TableKnobs = typeof TABLE_DEFAULTS;

const TABLE_KNOBS: readonly Knob<TableKnobs>[] = [
	num("fanDeg", "Fan", 0, 15, 0.5, "°"),
	num("hoverLift", "Hover lift", 0, 24, 1, "px"),
	FLICK,
	...TARGET_KNOBS,
];

const WALLET_DEFAULTS = {
	peek: 14,
	axisLock: 10,
	expandDistance: 180,
	completion: 0.5,
	dismissDistance: 120,
	rubberLimit: 40,
	flickSpeed: 0.5,
};
export type WalletKnobs = typeof WALLET_DEFAULTS;

const WALLET_KNOBS: readonly Knob<WalletKnobs>[] = [
	num("peek", "Peek", 4, 48, 1, "px"),
	num("axisLock", "Axis lock", 2, 40, 1, "px"),
	num("expandDistance", "Expand distance", 60, 400, 5, "px"),
	num("completion", "Completion p", 0.1, 0.9, 0.05),
	num("dismissDistance", "Dismiss distance", 40, 300, 5, "px"),
	num("rubberLimit", "Sideways rubber limit", 0, 120, 2, "px"),
	FLICK,
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

const WHOLE_DEFAULTS = {
	holdMs: 220,
	deckFollowStiffness: 700,
	threshold: 100,
	flickSpeed: 0.5,
	...TARGET_DEFAULTS,
};
export type WholeKnobs = typeof WHOLE_DEFAULTS;

const WHOLE_KNOBS: readonly Knob<WholeKnobs>[] = [
	num("holdMs", "Hold", 80, 800, 10, "ms"),
	num("deckFollowStiffness", "Deck follow stiffness", 100, 2000, 20),
	num("threshold", "Threshold", 40, 240, 2, "px"),
	FLICK,
	...TARGET_KNOBS,
];

export type KnobsOf = {
	readonly stack: StackKnobs;
	readonly table: TableKnobs;
	readonly wallet: WalletKnobs;
	readonly swipe: SwipeKnobs;
	readonly whole: WholeKnobs;
};

export const DEFAULTS: KnobsOf = {
	stack: STACK_DEFAULTS,
	table: TABLE_DEFAULTS,
	wallet: WALLET_DEFAULTS,
	swipe: SWIPE_DEFAULTS,
	whole: WHOLE_DEFAULTS,
};

export const KNOBS: { readonly [K in VariantKey]: readonly AnyKnob[] } = {
	stack: STACK_KNOBS,
	table: TABLE_KNOBS,
	wallet: WALLET_KNOBS,
	swipe: SWIPE_KNOBS,
	whole: WHOLE_KNOBS,
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

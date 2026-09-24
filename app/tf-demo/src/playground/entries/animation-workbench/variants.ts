import type { DeckMotionOverrides } from "../deck-models/runtime-config";

export type Variant = {
	readonly id: string;
	readonly name: string;
	readonly motion: DeckMotionOverrides;
};

export type Parameter = {
	readonly key: Exclude<keyof DeckMotionOverrides, "specs">;
	readonly label: string;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly unit?: string;
};

export const PARAMETERS: readonly Parameter[] = [
	{
		key: "zoneFeedbackMs",
		label: "Zone feedback",
		min: 0,
		max: 1000,
		step: 10,
		unit: "ms",
	},
	{
		key: "tiltMax",
		label: "Maximum left tilt",
		min: -30,
		max: 0,
		step: 1,
		unit: "deg",
	},
	{
		key: "tiltPerPx",
		label: "Tilt per pixel",
		min: 0,
		max: 0.2,
		step: 0.005,
	},
	{
		key: "deckFollow",
		label: "Deck follow",
		min: 0,
		max: 1,
		step: 0.05,
	},
	{
		key: "deckFollowFalloff",
		label: "Follow falloff per card",
		min: 0,
		max: 0.5,
		step: 0.01,
	},
	{
		key: "swipeBreakPx",
		label: "Tear-off distance",
		min: 16,
		max: 200,
		step: 2,
		unit: "px",
	},
	{
		key: "flyDistance",
		label: "Exit distance",
		min: 100,
		max: 1500,
		step: 10,
		unit: "px",
	},
	{
		key: "flyRotateTo",
		label: "Exit rotation",
		min: -90,
		max: 0,
		step: 1,
		unit: "deg",
	},
	{
		key: "contextStaggerMs",
		label: "Context stagger",
		min: 0,
		max: 200,
		step: 5,
		unit: "ms",
	},
	{
		key: "contextStaggerMaxMs",
		label: "Maximum stagger",
		min: 0,
		max: 1000,
		step: 10,
		unit: "ms",
	},
	{
		key: "headingEdgeMs",
		label: "Heading movement",
		min: 0,
		max: 600,
		step: 10,
		unit: "ms",
	},
	{ key: "openScale", label: "Selected scale", min: 1, max: 1.2, step: 0.01 },
	{ key: "stiffness", label: "Drag stiffness", min: 50, max: 1500, step: 10 },
	{ key: "damping", label: "Drag damping", min: 1, max: 120, step: 1 },
	{
		key: "morphStiffness",
		label: "Morph stiffness",
		min: 50,
		max: 1500,
		step: 10,
	},
	{ key: "morphDamping", label: "Morph damping", min: 1, max: 120, step: 1 },
	{
		key: "durationScale",
		label: "Timing multiplier",
		min: 0.25,
		max: 3,
		step: 0.05,
	},
	{
		key: "commitDistance",
		label: "Commit distance",
		min: 20,
		max: 240,
		step: 1,
		unit: "px",
	},
	{
		key: "throwProjectionMs",
		label: "Throw projection",
		min: 0,
		max: 400,
		step: 10,
		unit: "ms",
	},
];

const STORAGE_KEY = "deck-motion-variants-v1";

/** Saved settings are optional; the baseline always comes from the runtime. */
export function readVariants(): Variant[] {
	try {
		const saved: unknown = JSON.parse(
			localStorage.getItem(STORAGE_KEY) ?? "[]",
		);
		if (!Array.isArray(saved)) return [];
		return saved.flatMap((value: unknown) => {
			if (
				typeof value !== "object" ||
				value === null ||
				!("id" in value) ||
				!("name" in value) ||
				!("motion" in value) ||
				typeof value.id !== "string" ||
				typeof value.name !== "string" ||
				typeof value.motion !== "object" ||
				value.motion === null
			)
				return [];
			const motion: DeckMotionOverrides = {};
			for (const parameter of PARAMETERS) {
				const next: unknown = Reflect.get(value.motion, parameter.key);
				if (
					typeof next === "number" &&
					Number.isFinite(next) &&
					next >= parameter.min &&
					next <= parameter.max
				)
					motion[parameter.key] = next;
			}
			return [{ id: value.id, name: value.name, motion }];
		});
	} catch {
		return [];
	}
}

export function saveVariants(variants: readonly Variant[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(variants));
	} catch {
		// Private browsing can deny storage; variants still work for this visit.
	}
}

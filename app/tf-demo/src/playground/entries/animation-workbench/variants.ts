import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { DeckMotionOverrides } from "@/workspace/motion/runtime-config";

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
		label: "Maximum tilt",
		min: 0,
		max: 30,
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
	{
		key: "flickSpeed",
		label: "Flick speed",
		min: 0.1,
		max: 3,
		step: 0.05,
		unit: "px/ms",
	},
];

/**
 * One knob's saved value: a finite number in the knob's range. Anything else,
 * such as a value a narrowed range no longer allows, is dropped, so the knob
 * falls back to the runtime's baseline and the rest of the variant survives.
 */
function knob({ min, max }: Parameter) {
	return Schema.optionalKey(
		Schema.Finite.check(
			Schema.isBetween({ minimum: min, maximum: max }),
		).pipe(Schema.catchDecoding(() => Effect.succeedNone)),
	);
}

/** Saved knobs only; the baseline always comes from the runtime. */
const VariantMotion = Schema.Struct(
	Object.fromEntries(
		PARAMETERS.map((parameter) => [parameter.key, knob(parameter)]),
	) as Record<Parameter["key"], ReturnType<typeof knob>>,
);

/** A named set of knob values the workbench compares with the baseline. */
export const VariantSchema = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	motion: VariantMotion,
});

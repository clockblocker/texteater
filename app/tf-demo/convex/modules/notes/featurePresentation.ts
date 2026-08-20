import { v } from "convex/values";

export const featureProjectionValidator = v.object({
	name: v.string(),
	value: v.string(),
});

export type FeatureProjection = {
	readonly name: string;
	readonly value: string;
};

/** Learner-inspection projection for Route Notes and the old history view. */
export function projectFeaturesForPresentation(
	value: unknown,
): FeatureProjection[] {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return [];
	}
	return Object.entries(value)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([name, member]) => ({ name, value: formatFeatureValue(member) }));
}

function formatFeatureValue(value: unknown): string {
	if (value === null) return "—";
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return String(value);
	}
	return JSON.stringify(value);
}

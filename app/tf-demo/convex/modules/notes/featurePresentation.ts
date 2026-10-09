import { v } from "convex/values";
import { featureValueText } from "../../../shared/feature-values";

export const featureProjectionValidator = v.object({
	name: v.string(),
	value: v.string(),
});

export type FeatureProjection = {
	readonly name: string;
	readonly value: string;
};

/** Learner-inspection projection for Notes and the old history view. */
export function projectFeaturesForPresentation(
	value: unknown,
): FeatureProjection[] {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return [];
	}
	return Object.entries(value)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([name, member]) => ({
			name,
			// Printed as Notes print it (`Masc/Neut`); `—` for no value.
			value: featureValueText(member) ?? "—",
		}));
}

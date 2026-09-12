import type { z } from "zod";

export function nonEmptyFeatureBagSchema<
	const Schema extends z.ZodType<Record<string, unknown>>,
>(schema: Schema) {
	return schema.refine(
		(featureBag) =>
			Object.values(featureBag).some(
				(featureValue) => featureValue !== null,
			),
		{
			error: "Feature Bag must contain a marked feature",
		},
	);
}

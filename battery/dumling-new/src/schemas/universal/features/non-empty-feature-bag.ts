import type { z } from "zod";
import {
	hasMarkedFeature,
	nonEmptyFeatureBagError,
} from "../../../validation/semantics.js";

export function nonEmptyFeatureBagSchema<
	const Schema extends z.ZodType<Record<string, unknown>>,
>(schema: Schema) {
	return schema.refine(hasMarkedFeature, { error: nonEmptyFeatureBagError });
}

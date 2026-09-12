import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeDiscourseFormulaPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		discourseFormulaRole: DE_FEATURE_SCHEMA.discourseFormulaRole,
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DeDiscourseFormulaPhrasemeFeatureBags = z.infer<
	typeof DeDiscourseFormulaPhrasemeFeatureBagsSchema
>;

type _DeDiscourseFormulaPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeDiscourseFormulaPhrasemeFeatureBags>
>;

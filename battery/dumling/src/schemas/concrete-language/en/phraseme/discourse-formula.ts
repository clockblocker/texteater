import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnDiscourseFormulaPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		discourseFormulaRole: EN_FEATURE_SCHEMA.discourseFormulaRole,
	}),
});

export type EnDiscourseFormulaPhrasemeFeatureBags = z.infer<
	typeof EnDiscourseFormulaPhrasemeFeatureBagsSchema
>;

type _EnDiscourseFormulaPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnDiscourseFormulaPhrasemeFeatureBags>
>;

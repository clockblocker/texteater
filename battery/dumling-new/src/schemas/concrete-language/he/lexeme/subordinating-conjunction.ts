import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeSubordinatingConjunctionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		case: HE_FEATURE_SCHEMA.case.extract(["Tem"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeSubordinatingConjunctionFeatureBags = z.infer<
	typeof HeSubordinatingConjunctionFeatureBagsSchema
>;

type _HeSubordinatingConjunctionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeSubordinatingConjunctionFeatureBags>
>;

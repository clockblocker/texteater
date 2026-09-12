import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DePrefixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		hasSepPrefix: DE_FEATURE_SCHEMA.hasSepPrefix,
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DePrefixMorphemeFeatureBags = z.infer<
	typeof DePrefixMorphemeFeatureBagsSchema
>;

type _DePrefixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DePrefixMorphemeFeatureBags>
>;

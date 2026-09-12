import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HePrefixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HePrefixMorphemeFeatureBags = z.infer<
	typeof HePrefixMorphemeFeatureBagsSchema
>;

type _HePrefixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HePrefixMorphemeFeatureBags>
>;

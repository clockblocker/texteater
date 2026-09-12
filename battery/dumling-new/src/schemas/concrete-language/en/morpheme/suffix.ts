import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnSuffixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnSuffixMorphemeFeatureBags = z.infer<
	typeof EnSuffixMorphemeFeatureBagsSchema
>;

type _EnSuffixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnSuffixMorphemeFeatureBags>
>;

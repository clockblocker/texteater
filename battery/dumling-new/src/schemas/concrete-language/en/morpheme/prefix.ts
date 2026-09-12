import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnPrefixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnPrefixMorphemeFeatureBags = z.infer<
	typeof EnPrefixMorphemeFeatureBagsSchema
>;

type _EnPrefixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnPrefixMorphemeFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeSuffixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DeSuffixMorphemeFeatureBags = z.infer<
	typeof DeSuffixMorphemeFeatureBagsSchema
>;

type _DeSuffixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeSuffixMorphemeFeatureBags>
>;

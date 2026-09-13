import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeSuffixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeSuffixMorphemeFeatureBags = z.infer<
	typeof HeSuffixMorphemeFeatureBagsSchema
>;

type _HeSuffixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeSuffixMorphemeFeatureBags>
>;

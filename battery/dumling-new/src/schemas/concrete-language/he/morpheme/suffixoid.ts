import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeSuffixoidMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeSuffixoidMorphemeFeatureBags = z.infer<
	typeof HeSuffixoidMorphemeFeatureBagsSchema
>;

type _HeSuffixoidMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeSuffixoidMorphemeFeatureBags>
>;

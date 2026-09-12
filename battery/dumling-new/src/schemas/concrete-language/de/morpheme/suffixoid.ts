import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeSuffixoidMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DeSuffixoidMorphemeFeatureBags = z.infer<
	typeof DeSuffixoidMorphemeFeatureBagsSchema
>;

type _DeSuffixoidMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeSuffixoidMorphemeFeatureBags>
>;

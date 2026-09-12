import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeCircumfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeCircumfixMorphemeFeatureBags = z.infer<
	typeof HeCircumfixMorphemeFeatureBagsSchema
>;

type _HeCircumfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeCircumfixMorphemeFeatureBags>
>;

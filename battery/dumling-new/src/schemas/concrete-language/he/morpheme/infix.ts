import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeInfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeInfixMorphemeFeatureBags = z.infer<
	typeof HeInfixMorphemeFeatureBagsSchema
>;

type _HeInfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeInfixMorphemeFeatureBags>
>;

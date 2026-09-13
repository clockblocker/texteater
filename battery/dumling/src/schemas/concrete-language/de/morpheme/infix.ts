import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeInfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type DeInfixMorphemeFeatureBags = z.infer<
	typeof DeInfixMorphemeFeatureBagsSchema
>;

type _DeInfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeInfixMorphemeFeatureBags>
>;

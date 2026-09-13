import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnInfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type EnInfixMorphemeFeatureBags = z.infer<
	typeof EnInfixMorphemeFeatureBagsSchema
>;

type _EnInfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnInfixMorphemeFeatureBags>
>;

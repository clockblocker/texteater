import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnCliticMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnCliticMorphemeFeatureBags = z.infer<
	typeof EnCliticMorphemeFeatureBagsSchema
>;

type _EnCliticMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnCliticMorphemeFeatureBags>
>;

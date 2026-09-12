import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeCliticMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DeCliticMorphemeFeatureBags = z.infer<
	typeof DeCliticMorphemeFeatureBagsSchema
>;

type _DeCliticMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeCliticMorphemeFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeCliticMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeCliticMorphemeFeatureBags = z.infer<
	typeof HeCliticMorphemeFeatureBagsSchema
>;

type _HeCliticMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeCliticMorphemeFeatureBags>
>;

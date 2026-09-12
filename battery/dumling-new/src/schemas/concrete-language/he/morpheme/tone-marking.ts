import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeToneMarkingMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeToneMarkingMorphemeFeatureBags = z.infer<
	typeof HeToneMarkingMorphemeFeatureBagsSchema
>;

type _HeToneMarkingMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeToneMarkingMorphemeFeatureBags>
>;

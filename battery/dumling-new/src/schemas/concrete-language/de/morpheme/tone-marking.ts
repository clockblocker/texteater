import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeToneMarkingMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DeToneMarkingMorphemeFeatureBags = z.infer<
	typeof DeToneMarkingMorphemeFeatureBagsSchema
>;

type _DeToneMarkingMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeToneMarkingMorphemeFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnToneMarkingMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type EnToneMarkingMorphemeFeatureBags = z.infer<
	typeof EnToneMarkingMorphemeFeatureBagsSchema
>;

type _EnToneMarkingMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnToneMarkingMorphemeFeatureBags>
>;

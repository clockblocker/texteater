import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnSuffixoidMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type EnSuffixoidMorphemeFeatureBags = z.infer<
	typeof EnSuffixoidMorphemeFeatureBagsSchema
>;

type _EnSuffixoidMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnSuffixoidMorphemeFeatureBags>
>;

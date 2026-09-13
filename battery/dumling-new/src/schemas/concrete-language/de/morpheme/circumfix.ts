import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeCircumfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type DeCircumfixMorphemeFeatureBags = z.infer<
	typeof DeCircumfixMorphemeFeatureBagsSchema
>;

type _DeCircumfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeCircumfixMorphemeFeatureBags>
>;

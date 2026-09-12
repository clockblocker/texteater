import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnCircumfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnCircumfixMorphemeFeatureBags = z.infer<
	typeof EnCircumfixMorphemeFeatureBagsSchema
>;

type _EnCircumfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnCircumfixMorphemeFeatureBags>
>;

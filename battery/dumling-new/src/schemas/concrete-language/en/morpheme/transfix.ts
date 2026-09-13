import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnTransfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type EnTransfixMorphemeFeatureBags = z.infer<
	typeof EnTransfixMorphemeFeatureBagsSchema
>;

type _EnTransfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnTransfixMorphemeFeatureBags>
>;

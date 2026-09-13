import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeTransfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type DeTransfixMorphemeFeatureBags = z.infer<
	typeof DeTransfixMorphemeFeatureBagsSchema
>;

type _DeTransfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeTransfixMorphemeFeatureBags>
>;

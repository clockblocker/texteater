import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeDuplifixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeDuplifixMorphemeFeatureBags = z.infer<
	typeof HeDuplifixMorphemeFeatureBagsSchema
>;

type _HeDuplifixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeDuplifixMorphemeFeatureBags>
>;

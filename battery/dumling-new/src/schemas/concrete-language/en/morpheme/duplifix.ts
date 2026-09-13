import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnDuplifixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type EnDuplifixMorphemeFeatureBags = z.infer<
	typeof EnDuplifixMorphemeFeatureBagsSchema
>;

type _EnDuplifixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnDuplifixMorphemeFeatureBags>
>;

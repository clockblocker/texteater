import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnInterfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type EnInterfixMorphemeFeatureBags = z.infer<
	typeof EnInterfixMorphemeFeatureBagsSchema
>;

type _EnInterfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnInterfixMorphemeFeatureBags>
>;

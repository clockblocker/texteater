import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeInterfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type DeInterfixMorphemeFeatureBags = z.infer<
	typeof DeInterfixMorphemeFeatureBagsSchema
>;

type _DeInterfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeInterfixMorphemeFeatureBags>
>;

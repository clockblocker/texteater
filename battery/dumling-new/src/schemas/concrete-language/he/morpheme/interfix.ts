import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeInterfixMorphemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeInterfixMorphemeFeatureBags = z.infer<
	typeof HeInterfixMorphemeFeatureBagsSchema
>;

type _HeInterfixMorphemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeInterfixMorphemeFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeConstructionFusionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeConstructionFusionFeatureBags = z.infer<
	typeof HeConstructionFusionFeatureBagsSchema
>;

type _HeConstructionFusionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeConstructionFusionFeatureBags>
>;

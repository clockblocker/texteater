import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeIdiomPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeIdiomPhrasemeFeatureBags = z.infer<
	typeof HeIdiomPhrasemeFeatureBagsSchema
>;

type _HeIdiomPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeIdiomPhrasemeFeatureBags>
>;

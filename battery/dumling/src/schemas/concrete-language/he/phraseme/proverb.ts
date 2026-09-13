import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeProverbPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeProverbPhrasemeFeatureBags = z.infer<
	typeof HeProverbPhrasemeFeatureBagsSchema
>;

type _HeProverbPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeProverbPhrasemeFeatureBags>
>;

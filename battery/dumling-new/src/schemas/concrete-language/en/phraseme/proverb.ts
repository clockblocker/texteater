import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnProverbPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type EnProverbPhrasemeFeatureBags = z.infer<
	typeof EnProverbPhrasemeFeatureBagsSchema
>;

type _EnProverbPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnProverbPhrasemeFeatureBags>
>;

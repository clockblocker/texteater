import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeProverbPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type DeProverbPhrasemeFeatureBags = z.infer<
	typeof DeProverbPhrasemeFeatureBagsSchema
>;

type _DeProverbPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeProverbPhrasemeFeatureBags>
>;

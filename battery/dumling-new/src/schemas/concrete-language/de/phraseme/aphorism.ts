import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeAphorismPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DeAphorismPhrasemeFeatureBags = z.infer<
	typeof DeAphorismPhrasemeFeatureBagsSchema
>;

type _DeAphorismPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAphorismPhrasemeFeatureBags>
>;

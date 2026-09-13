import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnAphorismPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type EnAphorismPhrasemeFeatureBags = z.infer<
	typeof EnAphorismPhrasemeFeatureBagsSchema
>;

type _EnAphorismPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnAphorismPhrasemeFeatureBags>
>;

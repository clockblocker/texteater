import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeAphorismPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeAphorismPhrasemeFeatureBags = z.infer<
	typeof HeAphorismPhrasemeFeatureBagsSchema
>;

type _HeAphorismPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeAphorismPhrasemeFeatureBags>
>;

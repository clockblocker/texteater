import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeInterjectionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeInterjectionFeatureBags = z.infer<
	typeof HeInterjectionFeatureBagsSchema
>;

type _HeInterjectionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeInterjectionFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeOtherFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeOtherFeatureBags = z.infer<typeof HeOtherFeatureBagsSchema>;

type _HeOtherFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeOtherFeatureBags>
>;

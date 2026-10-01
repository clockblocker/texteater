import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DeSubordinatingConjunctionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type DeSubordinatingConjunctionFeatureBags = z.infer<
	typeof DeSubordinatingConjunctionFeatureBagsSchema
>;

type _DeSubordinatingConjunctionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeSubordinatingConjunctionFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HeCoordinatingConjunctionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeCoordinatingConjunctionFeatureBags = z.infer<
	typeof HeCoordinatingConjunctionFeatureBagsSchema
>;

type _HeCoordinatingConjunctionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeCoordinatingConjunctionFeatureBags>
>;

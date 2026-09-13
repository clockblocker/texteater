import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeCoordinatingConjunctionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		conjType: DE_FEATURE_SCHEMA.conjType.extract(["Comp"]),
	}),
});

export type DeCoordinatingConjunctionFeatureBags = z.infer<
	typeof DeCoordinatingConjunctionFeatureBagsSchema
>;

type _DeCoordinatingConjunctionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeCoordinatingConjunctionFeatureBags>
>;

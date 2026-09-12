import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnCoordinatingConjunctionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		polarity: EN_FEATURE_SCHEMA.polarity.extract(["Neg"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnCoordinatingConjunctionFeatureBags = z.infer<
	typeof EnCoordinatingConjunctionFeatureBagsSchema
>;

type _EnCoordinatingConjunctionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnCoordinatingConjunctionFeatureBags>
>;

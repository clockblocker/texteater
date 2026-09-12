import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnSubordinatingConjunctionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADP", "SCONJ"]),
		style: EN_FEATURE_SCHEMA.style.extract(["Vrnc"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnSubordinatingConjunctionFeatureBags = z.infer<
	typeof EnSubordinatingConjunctionFeatureBagsSchema
>;

type _EnSubordinatingConjunctionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnSubordinatingConjunctionFeatureBags>
>;

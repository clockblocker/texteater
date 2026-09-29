import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnAdverbFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		comparable: EN_FEATURE_SCHEMA.comparable,
		extPos: EN_FEATURE_SCHEMA.extPos.extract([
			"ADP",
			"ADV",
			"CCONJ",
			"SCONJ",
		]),
		numForm: EN_FEATURE_SCHEMA.numForm.extract(["Word"]),
		numType: EN_FEATURE_SCHEMA.numType.extract(["Frac", "Mult", "Ord"]),
		pronType: featureValueSetSchema(
			EN_FEATURE_SCHEMA.pronType.extract([
				"Dem",
				"Ind",
				"Int",
				"Neg",
				"Rel",
				"Tot",
			]),
		),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			degree: EN_FEATURE_SCHEMA.degree.extract(["Cmp", "Pos", "Sup"]),
		}),
	),
});

export type EnAdverbFeatureBags = z.infer<typeof EnAdverbFeatureBagsSchema>;

type _EnAdverbFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnAdverbFeatureBags>
>;

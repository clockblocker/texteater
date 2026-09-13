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

export const EnDeterminerFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		definite: EN_FEATURE_SCHEMA.definite.extract(["Def", "Ind"]),
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADV", "PRON"]),
		numForm: EN_FEATURE_SCHEMA.numForm.extract(["Word"]),
		numType: EN_FEATURE_SCHEMA.numType.extract(["Frac"]),
		pronType: featureValueSetSchema(
			EN_FEATURE_SCHEMA.pronType.extract([
				"Art",
				"Dem",
				"Ind",
				"Int",
				"Neg",
				"Rcp",
				"Rel",
				"Tot",
			]),
		),
		style: EN_FEATURE_SCHEMA.style.extract(["Vrnc"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			number: EN_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});

export type EnDeterminerFeatureBags = z.infer<
	typeof EnDeterminerFeatureBagsSchema
>;

type _EnDeterminerFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnDeterminerFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeOtherFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: DE_FEATURE_SCHEMA.abbr,
		foreign: DE_FEATURE_SCHEMA.foreign,
		hyph: DE_FEATURE_SCHEMA.hyph,
		numType: DE_FEATURE_SCHEMA.numType.extract(["Card", "Mult", "Range"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case.extract(["Acc", "Dat", "Gen", "Nom"]),
			gender: DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
			mood: DE_FEATURE_SCHEMA.mood.extract(["Imp", "Ind", "Sub"]),
			number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
			verbForm: DE_FEATURE_SCHEMA.verbForm.extract([
				"Fin",
				"Inf",
				"Part",
			]),
		}),
	),
});

export type DeOtherFeatureBags = z.infer<typeof DeOtherFeatureBagsSchema>;

type _DeOtherFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeOtherFeatureBags>
>;

import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnAuxiliaryFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			mood: EN_FEATURE_SCHEMA.mood.extract(["Imp", "Ind", "Sub"]),
			number: EN_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
			person: EN_FEATURE_SCHEMA.person.extract(["1", "2", "3"]),
			tense: EN_FEATURE_SCHEMA.tense.extract(["Past", "Pres"]),
			verbForm: EN_FEATURE_SCHEMA.verbForm.extract([
				"Fin",
				"Inf",
				"Part",
			]),
		}),
	),
});

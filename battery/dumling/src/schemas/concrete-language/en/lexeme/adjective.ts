import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnAdjectiveFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		comparable: EN_FEATURE_SCHEMA.comparable,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADP", "ADV", "SCONJ"]),
		numForm: EN_FEATURE_SCHEMA.numForm.extract(["Combi", "Word"]),
		numType: EN_FEATURE_SCHEMA.numType.extract(["Frac", "Ord"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			degree: EN_FEATURE_SCHEMA.degree.extract(["Cmp", "Pos", "Sup"]),
		}),
	),
});

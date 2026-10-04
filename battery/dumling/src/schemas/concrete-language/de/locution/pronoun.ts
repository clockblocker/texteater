import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// A PRON Locution (was für einer) is a stem: one Lemma whose Surfaces mark
// case, number and gender, under the closed-class rule (ADR 0039).
export const DePronounLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case,
			gender: DE_FEATURE_SCHEMA.gender,
			number: DE_FEATURE_SCHEMA.number,
		}),
	),
});

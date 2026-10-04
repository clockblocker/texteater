import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HePronounFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		definite: HE_FEATURE_SCHEMA.definite.extract(["Def"]),
		pronType: HE_FEATURE_SCHEMA.pronType.extract([
			"Dem",
			"Ind",
			"Int",
			"Prs",
		]),
		reflex: HE_FEATURE_SCHEMA.reflex,
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			gender: featureValueSetSchema(
				HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
			),
			number: HE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
			person: HE_FEATURE_SCHEMA.person.extract(["1", "2", "3"]),
		}),
	),
});

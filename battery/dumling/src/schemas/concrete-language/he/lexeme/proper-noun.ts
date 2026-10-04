import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeProperNounFeatureBagsSchema = featureBags({
	// A name canonically cited with its article (die Schweiz) owns it like a
	// common noun; a name cited bare (Berlin) has none (ADR 0035).
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: HE_FEATURE_SCHEMA.abbr,
		article: HE_FEATURE_SCHEMA.article.extract(["Definite"]),
		gender: featureValueSetSchema(
			HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
		),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			number: HE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});

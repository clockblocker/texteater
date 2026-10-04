import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

const gender = DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]);
export const DeProperNounFeatureBagsSchema = featureBags({
	// A name canonically cited with its article (die Schweiz) owns it like a
	// common noun; a name cited bare (Berlin) has none (ADR 0035).
	[FeatureBagKind.Core]: featureBagSchema({
		article: DE_FEATURE_SCHEMA.article.extract(["Definite"]),
		gender,
	}),
	// A surname or coined name has no Core gender; a singular Surface marks
	// the gender its owned article or an agreeing adjective shows (der junge
	// Schwarzkopf), as an adjectival noun's does (ADR 0040).
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case.extract(["Acc", "Dat", "Gen", "Nom"]),
			gender,
			number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});

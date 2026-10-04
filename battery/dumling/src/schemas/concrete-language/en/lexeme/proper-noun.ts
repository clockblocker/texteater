import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnProperNounFeatureBagsSchema = featureBags({
	// A name canonically cited with its article (die Schweiz) owns it like a
	// common noun; a name cited bare (Berlin) has none (ADR 0035).
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		article: EN_FEATURE_SCHEMA.article.extract(["Definite"]),
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["PROPN"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			number: EN_FEATURE_SCHEMA.number.extract(["Plur", "Ptan", "Sing"]),
		}),
	),
});

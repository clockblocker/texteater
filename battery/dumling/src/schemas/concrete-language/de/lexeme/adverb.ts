import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeAdverbFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		// No pronType: it split no ADV Lemma. An adverb's series shows in its
		// Reading's Emoji Description, and whether it is closed-class is a
		// lookup in dumspec's Authored Inventory (system ADR 0029).
		comparable: DE_FEATURE_SCHEMA.comparable,
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			degree: DE_FEATURE_SCHEMA.degree.extract(["Cmp", "Pos", "Sup"]),
		}),
	),
});

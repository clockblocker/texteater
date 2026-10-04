import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";
import { DeAdverbFeatureBagsSchema } from "../lexeme/adverb.js";

// An ADV Locution borrows the ADV Lexeme's Degree and records whether it has
// comparison forms (ADR 0039, ADR 0042). Most have none (zum Teil, ganz und
// gar), so they mark no Degree and their spelling is their Grundform.
export const DeAdverbLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		comparable: DE_FEATURE_SCHEMA.comparable,
	}),
	[FeatureBagKind.Inflectional]:
		DeAdverbFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});

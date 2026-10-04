import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";
import { EnAdverbFeatureBagsSchema } from "../lexeme/adverb.js";

// An ADV Locution borrows the ADV Lexeme's Degree and records whether it has
// comparison forms (ADR 0039, ADR 0042). Most have none (by and large), so
// they mark no Degree and their spelling is their Grundform.
export const EnAdverbLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		comparable: EN_FEATURE_SCHEMA.comparable,
	}),
	[FeatureBagKind.Inflectional]:
		EnAdverbFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});

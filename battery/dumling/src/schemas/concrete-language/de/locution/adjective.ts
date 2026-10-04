import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";
import { DeAdjectiveFeatureBagsSchema } from "../lexeme/adjective.js";

// An ADJ Locution declines attributively like an adjective: die fix und
// fertigen Läufer (ADR 0039). Like an ADJ Lexeme, it records whether it has
// comparison forms (ADR 0042).
export const DeAdjectiveLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		comparable: DE_FEATURE_SCHEMA.comparable,
	}),
	[FeatureBagKind.Inflectional]:
		DeAdjectiveFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});

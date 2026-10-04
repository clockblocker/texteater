import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeAdjectiveFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		comparable: DE_FEATURE_SCHEMA.comparable,
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case,
			degree: DE_FEATURE_SCHEMA.degree,
			gender: DE_FEATURE_SCHEMA.gender,
			number: DE_FEATURE_SCHEMA.number,
		}),
	),
});

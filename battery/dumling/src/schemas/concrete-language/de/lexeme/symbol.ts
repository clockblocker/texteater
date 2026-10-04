import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeSymbolFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: DE_FEATURE_SCHEMA.case,
			gender: DE_FEATURE_SCHEMA.gender,
			number: DE_FEATURE_SCHEMA.number,
		}),
	),
});

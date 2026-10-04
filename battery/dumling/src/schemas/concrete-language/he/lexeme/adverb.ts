import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeAdverbFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		prefix: HE_FEATURE_SCHEMA.prefix,
	}),
});

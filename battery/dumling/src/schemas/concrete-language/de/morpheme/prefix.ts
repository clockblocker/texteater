import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DePrefixMorphemeFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		hasSepPrefix: DE_FEATURE_SCHEMA.hasSepPrefix,
	}),
});

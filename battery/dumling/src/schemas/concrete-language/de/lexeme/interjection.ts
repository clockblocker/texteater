import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeInterjectionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		partType: DE_FEATURE_SCHEMA.partType.extract(["Res"]),
	}),
});

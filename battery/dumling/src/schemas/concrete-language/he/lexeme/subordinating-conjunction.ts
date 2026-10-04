import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeSubordinatingConjunctionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		case: HE_FEATURE_SCHEMA.case.extract(["Tem"]),
	}),
});

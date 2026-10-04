import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeAdpositionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: HE_FEATURE_SCHEMA.abbr,
		case: HE_FEATURE_SCHEMA.case.extract(["Acc", "Gen"]),
	}),
});

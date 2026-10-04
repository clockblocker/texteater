import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnCoordinatingConjunctionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		polarity: EN_FEATURE_SCHEMA.polarity.extract(["Neg"]),
	}),
});

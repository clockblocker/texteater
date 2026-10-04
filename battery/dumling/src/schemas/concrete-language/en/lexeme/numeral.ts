import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnNumeralFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["PROPN"]),
		numForm: EN_FEATURE_SCHEMA.numForm.extract(["Digit", "Roman", "Word"]),
		numType: EN_FEATURE_SCHEMA.numType.extract(["Card", "Frac"]),
	}),
});

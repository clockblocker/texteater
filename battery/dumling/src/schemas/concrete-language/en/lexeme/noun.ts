import { z } from "zod";
import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnNounFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADV", "PROPN"]),
		numForm: EN_FEATURE_SCHEMA.numForm.extract(["Combi", "Digit", "Word"]),
		numType: EN_FEATURE_SCHEMA.numType.extract(["Card", "Frac", "Ord"]),
	}),
	// A noun Surface is the noun's own form, so `books` is one Surface; its
	// article is an attested member, not a feature (ADR 0040).
	[FeatureBagKind.Inflectional]: z.strictObject({
		number: EN_FEATURE_SCHEMA.number
			.extract(["Plur", "Ptan", "Sing"])
			.nullable(),
	}),
});

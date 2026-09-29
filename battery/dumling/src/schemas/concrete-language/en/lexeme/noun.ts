import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnNounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADV", "PROPN"]),
		foreign: EN_FEATURE_SCHEMA.foreign,
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

export type EnNounFeatureBags = z.infer<typeof EnNounFeatureBagsSchema>;

type _EnNounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnNounFeatureBags>
>;

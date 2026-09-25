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
		style: EN_FEATURE_SCHEMA.style.extract(["Expr", "Vrnc"]),
	}),
	// The noun owns its article, so every noun Surface says which it has
	// (ADR 0035); normalizedSurface stays the noun's own letters.
	[FeatureBagKind.Inflectional]: z.strictObject({
		article: EN_FEATURE_SCHEMA.article,
		number: EN_FEATURE_SCHEMA.number
			.extract(["Plur", "Ptan", "Sing"])
			.nullable(),
	}),
});

export type EnNounFeatureBags = z.infer<typeof EnNounFeatureBagsSchema>;

type _EnNounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnNounFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeNounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		gender: DE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
		hyph: DE_FEATURE_SCHEMA.hyph,
	}),
	// The noun owns its article, so every noun Surface says which it has
	// (ADR 0035); normalizedSurface stays the noun's own letters.
	[FeatureBagKind.Inflectional]: z.strictObject({
		article: DE_FEATURE_SCHEMA.article,
		case: DE_FEATURE_SCHEMA.case
			.extract(["Acc", "Dat", "Gen", "Nom"])
			.nullable(),
		number: DE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]).nullable(),
	}),
});

export type DeNounFeatureBags = z.infer<typeof DeNounFeatureBagsSchema>;

type _DeNounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeNounFeatureBags>
>;

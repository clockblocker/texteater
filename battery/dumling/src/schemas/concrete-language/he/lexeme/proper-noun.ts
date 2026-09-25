import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeProperNounFeatureBagsSchema = z.strictObject({
	// A name canonically cited with its article (die Schweiz) owns it like a
	// common noun; a name cited bare (Berlin) has none (ADR 0035).
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: HE_FEATURE_SCHEMA.abbr,
		article: HE_FEATURE_SCHEMA.article.extract(["Definite"]),
		gender: featureValueSetSchema(
			HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
		),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			number: HE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});

export type HeProperNounFeatureBags = z.infer<
	typeof HeProperNounFeatureBagsSchema
>;

type _HeProperNounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeProperNounFeatureBags>
>;

import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";
import { DeAdverbFeatureBagsSchema } from "../lexeme/adverb.js";

// An ADV Locution borrows the ADV Lexeme's Degree and records whether it has
// comparison forms (ADR 0039, ADR 0042). Most have none (zum Teil, ganz und
// gar), so they mark no Degree and their spelling is their Grundform.
export const DeAdverbLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		comparable: DE_FEATURE_SCHEMA.comparable,
	}),
	[FeatureBagKind.Inflectional]:
		DeAdverbFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});

export type DeAdverbLocutionFeatureBags = z.infer<
	typeof DeAdverbLocutionFeatureBagsSchema
>;

type _DeAdverbLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAdverbLocutionFeatureBags>
>;

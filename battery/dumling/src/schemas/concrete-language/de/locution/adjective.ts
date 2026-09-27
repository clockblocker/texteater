import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DeAdjectiveFeatureBagsSchema } from "../lexeme/adjective.js";

// An ADJ Locution declines attributively like an adjective: die fix und
// fertigen Läufer (ADR 0039).
export const DeAdjectiveLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]:
		DeAdjectiveFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});

export type DeAdjectiveLocutionFeatureBags = z.infer<
	typeof DeAdjectiveLocutionFeatureBagsSchema
>;

type _DeAdjectiveLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAdjectiveLocutionFeatureBags>
>;

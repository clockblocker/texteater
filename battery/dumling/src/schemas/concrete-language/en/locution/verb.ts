import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EnVerbFeatureBagsSchema } from "../lexeme/verb.js";

// A VERB Locution inflects like a verb: kicked the bucket (ADR 0039).
export const EnVerbLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]:
		EnVerbFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});

export type EnVerbLocutionFeatureBags = z.infer<
	typeof EnVerbLocutionFeatureBagsSchema
>;

type _EnVerbLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnVerbLocutionFeatureBags>
>;

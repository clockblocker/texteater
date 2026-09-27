import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DeNumeralFeatureBagsSchema } from "../lexeme/numeral.js";

// A NUM Locution (zwölf bis sechzehn) inflects where a numeral does (ADR 0039).
export const DeNumeralLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]:
		DeNumeralFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});

export type DeNumeralLocutionFeatureBags = z.infer<
	typeof DeNumeralLocutionFeatureBagsSchema
>;

type _DeNumeralLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeNumeralLocutionFeatureBags>
>;

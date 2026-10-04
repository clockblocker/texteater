import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DeNumeralFeatureBagsSchema } from "../lexeme/numeral.js";

// A NUM Locution (zwölf bis sechzehn) inflects where a numeral does (ADR 0039).
export const DeNumeralLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]:
		DeNumeralFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});

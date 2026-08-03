import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { markEveryMember, unresolved } from "./builders";

export const wordingVariantCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-proverb-variant-andere-zeiten-andere-sitten": {
			...unresolved(
				`${markEveryMember("Andere Zeiten")}, ${markEveryMember("andere Sitten")}.`,
			),
			contaminationKeys: [
				"de-proverb:andere-laender-andere-sitten",
				"de-proverb-variant:andere-zeiten-andere-sitten",
			],
			explanation:
				"OWID documents this recurrent component replacement, but the current empty-Core codec does not settle whether it realizes the Länder Kernform or a distinct Lemma.",
		},
		"grammar-de-proverb-variant-wer-rastet-rostet": {
			...unresolved(
				`${markEveryMember("Wer rastet")}, ${markEveryMember("rostet")}.`,
			),
			contaminationKeys: [
				"de-proverb:wer-rastet-der-rostet",
				"de-proverb-variant:wer-rastet-rostet",
			],
			explanation:
				"OWID documents the shortened form, but whether omission of der is a Full Surface of one Lemma or a separate canonical form remains unsettled.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

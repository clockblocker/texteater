import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedProverb } from "./builders";

export const wordingAndCoverageCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-proverb-demo-grube-partial": {
				...resolvedProverb({
					attested: "Wer anderen eine Grube gräbt",
					canonical:
						"Wer anderen eine Grube gräbt fällt selbst hinein",
					realizationCoverage: "Partial",
					prefix: "Auf dem beschädigten Tonband war nur der Anfang „",
					suffix: " …“ erhalten.",
				}),
				explanation:
					"The ellipsis signals genuinely unrealized fixed material; every realized word is selected.",
			},
			"grammar-de-proverb-demo-muss-historical-variant": {
				...resolvedProverb({
					attested: "Wer A sagt, muß auch B sagen",
					canonical: "Wer A sagt muss auch B sagen",
					spelling: "Variant",
					prefix: "In der Zeitung von 1985 stand das Sprichwort „",
					suffix: ".“",
				}),
				explanation:
					"The licensed pre-reform spelling remains Standard on the Surface and maps to current muss in the Lemma.",
			},
			"grammar-de-proverb-dev-casing-viele-koeche": {
				...resolvedProverb({
					attested: "viele Köche verderben den Brei",
					normalized: "Viele Köche verderben den Brei",
					canonical: "Viele Köche verderben den Brei",
					typoMemberIndices: [0],
					prefix: "Auf dem Schild war der Sprichwortanfang fälschlich kleingeschrieben: „",
					suffix: ".“",
				}),
				explanation:
					"A lowercase first word in the complete written proverb is an inappropriate-casing Typo and normalizes to uppercase.",
			},
			"grammar-de-proverb-dev-stille-wasser-typo": {
				...resolvedProverb({
					attested: "Stille Wasser sint tief",
					normalized: "Stille Wasser sind tief",
					canonical: "Stille Wasser sind tief",
					typoMemberIndices: [2],
					prefix: "Im Schülerheft stand der fehlerhafte Satz „",
					suffix: ".“",
				}),
				explanation:
					"Only the misspelled verb member is Typo and repaired.",
			},
			"grammar-de-proverb-dev-wes-brot-archaic": {
				...resolvedProverb({
					attested: "Wes Brot ich ess, des Lied ich sing",
					prefix: "Der Schauspieler verwendete im historischen Stück die alte Sprichwortform „",
					suffix: ".“",
					historical: true,
				}),
				explanation:
					"The archaic case forms and apocopated verbs characterize the grammatical use, not merely its spelling.",
			},
			"grammar-de-proverb-dev-reden-silber-partial": {
				...resolvedProverb({
					attested: "Reden ist Silber",
					canonical: "Reden ist Silber Schweigen ist Gold",
					realizationCoverage: "Partial",
					prefix: "Der abgerissene Zettel enthielt nur die halbe Zeile „",
					suffix: " …“.",
				}),
				explanation:
					"The visibly lost second clause is unrealized; Partial does not add it to normalized members.",
			},
			"grammar-de-proverb-accept-glashaus-partial": {
				...resolvedProverb({
					attested: "Wer im Glashaus sitzt",
					canonical:
						"Wer im Glashaus sitzt soll nicht mit Steinen werfen",
					realizationCoverage: "Partial",
					prefix: "Die Aufnahme endete nach dem klar erkennbaren Sprichwortanfang „",
					suffix: " …“.",
				}),
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);

import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const upstreamRejectionCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-x-unresolved-opaque-english-green": {
				input: {
					markedContext:
						"Nichtdeutsches Wort im deutschen Satz: <TARGET>green</TARGET>",
				},
				idealOutput: unresolved,
				explanation:
					"Under the current one-primary-language invariant, the English span is OpaqueText before click routing and cannot resolve on German Lexeme/X.",
			},
			"grammar-de-x-unresolved-opaque-hebrew-shalom": {
				input: {
					markedContext:
						"Nichtdeutsches Wort im deutschen Satz: <TARGET>שלום</TARGET>",
				},
				idealOutput: unresolved,
				explanation:
					"A legible non-primary-language word remains OpaqueText; script does not enable German code-switched routing.",
			},
			"grammar-de-x-unresolved-opaque-french-bonjour": {
				input: {
					markedContext:
						"Der deutsche Satz enthält das französische Wort <TARGET>bonjour</TARGET>.",
				},
				idealOutput: unresolved,
				explanation:
					"Explicit foreign identity confirms that segmentation should preserve the word as OpaqueText, not make it a German X Lexeme.",
			},
			"grammar-de-x-unresolved-opaque-japanese-arigatou": {
				input: {
					markedContext:
						"Der deutsche Satz zitiert <TARGET>ありがとう</TARGET> als japanisches Wort.",
				},
				idealOutput: unresolved,
				explanation:
					"Code-switched Japanese material is outside the enabled German segmentation language and remains OpaqueText.",
			},
			"grammar-de-x-unresolved-opaque-swedish-chocktillstand": {
				input: {
					markedContext:
						"Das schwedische Wort <TARGET>chocktillstånd</TARGET> steht in einem deutschen Satz.",
				},
				idealOutput: unresolved,
				explanation:
					"GSD's Foreign=Yes X attestation does not override Dumgen's current OpaqueText ownership for non-primary-language spans.",
			},
			"grammar-de-x-unresolved-typo-kaffe": {
				input: {
					markedContext: "Der <TARGET>Kaffe</TARGET> ist heiß.",
				},
				idealOutput: unresolved,
				explanation:
					"The intelligible typo belongs to German NOUN Kaffee. Normalization is honest on that route; X must not invent a residual Lemma.",
			},
			"grammar-de-x-unresolved-abbreviation-zb": {
				input: {
					markedContext:
						"Das gilt <TARGET>z.B.</TARGET> für diesen Fall.",
				},
				idealOutput: unresolved,
				explanation:
					"The established German abbreviation has a more informative ADV analysis; noisy GSD X attestations do not establish an X identity.",
			},
			"grammar-de-x-unresolved-typo-gelauffen": {
				input: {
					markedContext:
						"Sie ist schnell <TARGET>gelauffen</TARGET>.",
				},
				idealOutput: unresolved,
				explanation:
					"The recoverable German typo belongs to VERB gelaufen. The X route must not normalize it into an invented X Lemma.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);

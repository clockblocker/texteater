import { grammaticalLegend } from "../../../../../../../../../experiments/issue-22-compact-noun-dtos/compact-codecs";
import {
	defineLocalDemonstrations,
	definePromptSource,
} from "../../../../../../../../assembly";
import { inputSchema, outputSchema } from "./schemas";

const body = `PROTOTYPE ONLY: compact German Lexeme/NOUN Grammatical Resolution for issue #22.

The context contains one or more <TARGET>...</TARGET> members of exactly one
German Lexeme/NOUN. Resolve only that fixed route or return Unresolved. Emit one
orthography value per TARGET pair. Preserve attested inflection and lexical
material in the Surface; canonical form and core features identify the Lemma.
Use Citation only when the TARGET is presented as a standalone citation form.
A noun used in sentence context is Inflection even when its spelling matches
the canonical form. Use null for unmarked nullable features. Return only the
compact schema.

Compact legend:
${grammaticalLegend}

Citation Surfaces use inflectionalFeatures=null. Inflection Surfaces use the
compact inflectionalFeatures object.

Resolved requires non-null r. Unresolved requires r=null. Do not return verbose
property names, language, family, kind, target indices, Reading data,
explanations, confidence, or a different route.`;

const demonstrations = defineLocalDemonstrations({
	inputSchema,
	outputSchema,
	cases: [
		{
			input: { c: "Wir sitzen in der <TARGET>Bibliothek</TARGET>." },
			idealOutput: {
				d: "R",
				r: {
					o: ["S"],
					s: {
						n: "Bibliothek",
						p: "C",
						r: "F",
						k: "I",
						h: null,
						i: { c: "D", n: "S" },
					},
					l: { c: "Bibliothek", g: "F", h: null },
				},
			},
		},
	],
});

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/noun",
	inputSchema,
	outputSchema,
	body,
	demonstrations,
});

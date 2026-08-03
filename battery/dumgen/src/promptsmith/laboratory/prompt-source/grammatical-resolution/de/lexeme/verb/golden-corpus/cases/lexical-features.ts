import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { finite, inflection, ordinaryCore } from "./builders";

export const lexicalFeatureCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-verb-separable-imperative-aufpassen": {
			input: {
				markedContext:
					"<TARGET>Pass</TARGET> auf dich <TARGET>auf</TARGET>!",
			},
			idealOutput: inflection({
				normalizedSurface: "pass auf",
				canonicalForm: "aufpassen",
				memberOrthographies: ["Standard", "Standard"],
				coreFeatures: {
					hasGovPrep: "auf",
					hasSepPrefix: "auf",
					lexicallyReflexive: null,
					verbType: null,
				},
				inflectionalFeatures: {
					mood: "Imp",
					number: "Sing",
					person: "2",
					tense: null,
					verbForm: "Fin",
					voice: null,
				},
			}),
			explanation:
				"The stem and detached separable prefix are two marked members of one complete VERB Surface; the reflexive pronoun and governed preposition remain context.",
		},
		"grammar-de-verb-reflexive-erinnert": {
			input: {
				markedContext:
					"Sie <TARGET>erinnert</TARGET> sich an den Geruch.",
			},
			idealOutput: finite(
				"erinnert",
				"sich erinnern",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				{
					hasGovPrep: "an",
					hasSepPrefix: null,
					lexicallyReflexive: "Yes",
					verbType: null,
				},
			),
			explanation:
				"The reflexive pronoun and governed preposition are evidence, not members; both lexical facts stay on the Lemma.",
		},
		"grammar-de-verb-governed-preposition-wartet": {
			input: {
				markedContext:
					"Sie <TARGET>wartet</TARGET> auf den nächsten Zug.",
			},
			idealOutput: finite(
				"wartet",
				"warten",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				{ ...ordinaryCore, hasGovPrep: "auf" },
			),
		},
		"grammar-de-verb-separable-finite-aufstehen": {
			input: {
				markedContext:
					"Sie <TARGET>steht</TARGET> jeden Morgen früh <TARGET>auf</TARGET>.",
			},
			idealOutput: finite(
				"steht auf",
				"aufstehen",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				{ ...ordinaryCore, hasSepPrefix: "auf" },
				["Standard", "Standard"],
			),
			explanation:
				"Both detached members form one complete finite Surface of aufstehen; the intervening material remains context.",
		},
		"grammar-de-verb-reflexive-schaemt": {
			input: {
				markedContext: "Er <TARGET>schämt</TARGET> sich.",
			},
			idealOutput: finite(
				"schämt",
				"sich schämen",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				{
					hasGovPrep: null,
					hasSepPrefix: null,
					lexicallyReflexive: "Yes",
					verbType: null,
				},
			),
			explanation:
				"The unmarked reflexive pronoun establishes inherent reflexivity without joining the Surface.",
		},
		"grammar-de-verb-full-modal-mag": {
			input: {
				markedContext: "Sie <TARGET>mag</TARGET> Schokolade.",
			},
			idealOutput: finite("mag", "mögen", {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
			}),
			explanation:
				"Mögen with its own nominal object is a lexical full verb, not a modal auxiliary; verbType is therefore null for this use.",
		},
		"grammar-de-verb-full-werden": {
			input: {
				markedContext: "Sie <TARGET>wird</TARGET> Ärztin.",
			},
			idealOutput: finite("wird", "werden", {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
			}),
			explanation:
				"Lexical werden meaning become belongs to VERB rather than future/passive AUX.",
		},
		"grammar-de-verb-full-hat": {
			input: {
				markedContext: "Sie <TARGET>hat</TARGET> ein Fahrrad.",
			},
			idealOutput: finite("hat", "haben", {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
			}),
			explanation:
				"Possession haben is a full verb and is complementary to the AUX route's perfect-forming use.",
		},
		"grammar-de-verb-typo-tanzd": {
			input: { markedContext: "Er <TARGET>tanzd</TARGET> gern." },
			idealOutput: finite(
				"tanzt",
				"tanzen",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				ordinaryCore,
				["Typo"],
			),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

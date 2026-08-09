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
					"<TARGET>Pass</TARGET> <TARGET>auf</TARGET> dich <TARGET>auf</TARGET>!",
			},
			idealOutput: inflection({
				normalizedMembers: ["pass", "auf", "auf"],
				canonicalForm: "aufpassen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
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
				"The stem, governed preposition, and detached separable prefix are three positionally distinct fixed members; the contextual reflexive object dich remains free.",
		},
		"grammar-de-verb-reflexive-erinnert": {
			input: {
				markedContext:
					"Sie <TARGET>erinnert</TARGET> <TARGET>sich</TARGET> <TARGET>an</TARGET> den Geruch.",
			},
			idealOutput: finite(
				["erinnert", "sich", "an"],
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
				["Standard", "Standard", "Standard"],
			),
			explanation:
				"The inherently reflexive pronoun and governed preposition are realized fixed members, while the Lemma retains sich erinnern and its lexical features.",
		},
		"grammar-de-verb-governed-preposition-wartet": {
			input: {
				markedContext:
					"Sie <TARGET>wartet</TARGET> <TARGET>auf</TARGET> den nächsten Zug.",
			},
			idealOutput: finite(
				["wartet", "auf"],
				"warten",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				},
				{ ...ordinaryCore, hasGovPrep: "auf" },
				["Standard", "Standard"],
			),
		},
		"grammar-de-verb-separable-finite-aufstehen": {
			input: {
				markedContext:
					"Sie <TARGET>steht</TARGET> jeden Morgen früh <TARGET>auf</TARGET>.",
			},
			idealOutput: finite(
				["steht", "auf"],
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
				markedContext:
					"Er <TARGET>schämt</TARGET> <TARGET>sich</TARGET>.",
			},
			idealOutput: finite(
				["schämt", "sich"],
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
				["Standard", "Standard"],
			),
			explanation:
				"The inherently reflexive pronoun is a fixed Surface member and also establishes the Lemma-level feature.",
		},
		"grammar-de-verb-future-wird-reisen": {
			input: {
				markedContext:
					"Sie <TARGET>wird</TARGET> <TARGET>reisen</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: ["wird", "reisen"],
				canonicalForm: "reisen",
				memberOrthographies: ["Standard", "Standard"],
				inflectionalFeatures: {
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Inf",
					voice: null,
				},
			}),
			explanation:
				"Future-forming wird is fixed high-level material, while Surface morphology remains the infinitive morphology of reisen.",
		},
		"grammar-de-verb-passive-wurde-gebeten": {
			input: {
				markedContext:
					"Sie <TARGET>wurde</TARGET> <TARGET>um</TARGET> Geduld <TARGET>gebeten</TARGET>.",
			},
			idealOutput: inflection({
				normalizedMembers: ["wurde", "um", "gebeten"],
				canonicalForm: "bitten",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				coreFeatures: { ...ordinaryCore, hasGovPrep: "um" },
				inflectionalFeatures: {
					aspect: null,
					gender: null,
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Part",
					voice: null,
				},
			}),
			explanation:
				"Passive wurde and governed um are fixed members, but gebeten remains an ordinary Partizip II Surface with null clause-level voice.",
		},
		"grammar-de-verb-full-modal-mag": {
			input: {
				markedContext: "Sie <TARGET>mag</TARGET> Schokolade.",
			},
			idealOutput: finite(["mag"], "mögen", {
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
			idealOutput: finite(["wird"], "werden", {
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
			idealOutput: finite(["hat"], "haben", {
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
				["tanzt"],
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

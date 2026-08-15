import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { finite, inflection, ordinaryCore } from "./builders";

export const lexicalFeatureCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-verb-separable-imperative-aufpassen": {
			input: {
				markedContext:
					"<TARGET>Pass</TARGET> <TARGET>auf</TARGET> dich <TARGET>auf</TARGET>!",
				members: ["Pass", "auf", "auf"],
			},
			idealOutput: inflection({
				normalizedMembers: ["pass", "auf", "auf"],
				canonicalForm: "aufpassen",
				memberOrthographies: ["Standard", "Standard", "Standard"],
				coreFeatures: {
					hasGovPrep: "auf",
					hasSepPrefix: "auf",
					lexicallyReflexive: null,
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
				"Two auf. First governed preposition. Second separable prefix. dich free.",
		},
		"grammar-de-verb-reflexive-erinnert": {
			input: {
				markedContext:
					"Sie <TARGET>erinnert</TARGET> <TARGET>sich</TARGET> <TARGET>an</TARGET> den Geruch.",
				members: ["erinnert", "sich", "an"],
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
				},
				["Standard", "Standard", "Standard"],
			),
			explanation: "sich inherent. an governed. Both members.",
		},
		"grammar-de-verb-governed-preposition-wartet": {
			input: {
				markedContext:
					"Sie <TARGET>wartet</TARGET> <TARGET>auf</TARGET> den nächsten Zug.",
				members: ["wartet", "auf"],
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
				members: ["steht", "auf"],
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
		},
		"grammar-de-verb-reflexive-schaemt": {
			input: {
				markedContext:
					"Er <TARGET>schämt</TARGET> <TARGET>sich</TARGET>.",
				members: ["schämt", "sich"],
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
				},
				["Standard", "Standard"],
			),
		},
		"grammar-de-verb-future-wird-reisen": {
			input: {
				markedContext:
					"Sie <TARGET>wird</TARGET> <TARGET>reisen</TARGET>.",
				members: ["wird", "reisen"],
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
			explanation: "wird member. reisen head. Head stays Inf.",
		},
		"grammar-de-verb-passive-wurde-gebeten": {
			input: {
				markedContext:
					"Sie <TARGET>wurde</TARGET> <TARGET>um</TARGET> Geduld <TARGET>gebeten</TARGET>.",
				members: ["wurde", "um", "gebeten"],
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
				"wurde and um members. gebeten head. Head stays Part; voice null.",
		},
		"grammar-de-verb-full-modal-mag": {
			input: {
				markedContext: "Sie <TARGET>mag</TARGET> Schokolade.",
				members: ["mag"],
			},
			idealOutput: finite(["mag"], "mögen", {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
			}),
		},
		"grammar-de-verb-full-werden": {
			input: {
				markedContext: "Sie <TARGET>wird</TARGET> Ärztin.",
				members: ["wird"],
			},
			idealOutput: finite(["wird"], "werden", {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
			}),
		},
		"grammar-de-verb-full-hat": {
			input: {
				markedContext: "Sie <TARGET>hat</TARGET> ein Fahrrad.",
				members: ["hat"],
			},
			idealOutput: finite(["hat"], "haben", {
				mood: "Ind",
				number: "Sing",
				person: "3",
				tense: "Pres",
			}),
		},
		"grammar-de-verb-typo-tanzd": {
			input: {
				markedContext: "Er <TARGET>tanzd</TARGET> gern.",
				members: ["tanzd"],
			},
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

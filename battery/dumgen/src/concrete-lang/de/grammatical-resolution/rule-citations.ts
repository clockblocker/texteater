import type { CitingPrompt } from "../../../universal/rule-citations.js";
import { grammarPolicies } from "./judgments.js";

const policy = (
	name: string,
	text: string,
	paragraph: CitingPrompt["paragraphs"][number],
): CitingPrompt => ({
	name: `de/grammatical-resolution/${name}`,
	text,
	paragraphs: [paragraph],
});

/** The dumspec Rules each grammar policy paragraph implements (system ADR 0037). */
export const grammarPolicyCitations: readonly CitingPrompt[] = [
	policy("sharedPolicy.target", grammarPolicies.sharedPolicy.target, {
		opens: "The classified route and ordered",
		implements: [
			{ rule: "de/unresolved-over-repair", hash: "8379f464c655ba47" },
		],
	}),
	policy("sharedPolicy.identity", grammarPolicies.sharedPolicy.identity, {
		opens: "Core Features belong to the dictionary",
		implements: [
			{ rule: "de/core-features-are-identity", hash: "240b45072e01295e" },
			{
				rule: "de/canonical-form-is-the-headword",
				hash: "af3037e882625dcc",
			},
		],
	}),
	policy(
		"sharedPolicy.canonicalForm",
		grammarPolicies.sharedPolicy.canonicalForm,
		{
			opens: "Canonical Form is the exact",
			implements: [
				{
					rule: "de/canonical-form-is-the-headword",
					hash: "af3037e882625dcc",
				},
			],
		},
	),
	policy(
		"sharedPolicy.orthography",
		grammarPolicies.sharedPolicy.orthography,
		{
			opens: "Standard orthography includes",
			implements: [
				{ rule: "de/member-orthography", hash: "aec53224e9d5497a" },
				{
					rule: "de/abbreviation-is-one-segment",
					hash: "83496aec178971f1",
				},
				{
					rule: "de/variant-and-historical-status",
					hash: "9c2cdbb5c2f38ef4",
				},
			],
		},
	),
	policy("sharedPolicy.inflection", grammarPolicies.sharedPolicy.inflection, {
		opens: "Citation has null inflection",
		implements: [
			{
				rule: "de/empty-inflection-is-structural",
				hash: "2fc1eac4f11ccea0",
			},
		],
	}),
	policy("nounPolicy.suspension", grammarPolicies.nounPolicy.suspension, {
		opens: "For noun suspension",
		implements: [
			{
				rule: "de/suspended-compound-completion",
				hash: "d40697026790c142",
			},
			{
				rule: "de/empty-inflection-is-structural",
				hash: "2fc1eac4f11ccea0",
			},
		],
	}),
	policy("nounPolicy.articles", grammarPolicies.nounPolicy.articles, {
		opens: "German NOUN article features",
		implements: [
			{ rule: "de/noun-article-feature", hash: "1238c072e266ea82" },
			{ rule: "de/noun-owns-its-article", hash: "973eb75f84c89928" },
			{ rule: "de/fused-word-pieces", hash: "03c130dd30e6af58" },
			{
				rule: "de/canonical-form-is-the-headword",
				hash: "af3037e882625dcc",
			},
			{
				rule: "de/shared-article-in-coordination",
				hash: "d21d49079359e0b8",
			},
			{ rule: "de/partial-coverage", hash: "d7bb958508182059" },
		],
	}),
	policy("verbalIdentityPolicy", grammarPolicies.verbalIdentityPolicy, {
		opens: "For VERB, hasSepPrefix",
		implements: [
			{ rule: "de/verb-core-features", hash: "bcb53b5333fa8af4" },
			{
				rule: "de/governed-preposition-joins-its-governor",
				hash: "8f0eeeea8956479a",
			},
			{
				rule: "de/auxiliary-joins-the-verb-it-serves",
				hash: "17cec6bff2108a22",
			},
			{ rule: "de/verbal-surface-is-whole", hash: "974139977fd040ca" },
		],
	}),
	policy("governmentPolicy", grammarPolicies.governmentPolicy, {
		opens: "An adjective or noun target",
		implements: [
			{
				rule: "de/governed-preposition-joins-its-governor",
				hash: "8f0eeeea8956479a",
			},
		],
	}),
	policy("partialCoveragePolicy", grammarPolicies.partialCoveragePolicy, {
		opens: "Partial coverage is allowed",
		implements: [{ rule: "de/partial-coverage", hash: "d7bb958508182059" }],
	}),
];

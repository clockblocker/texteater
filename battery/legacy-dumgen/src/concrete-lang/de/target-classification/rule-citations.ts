import type { CitingPrompt } from "../../../universal/rule-citations.js";
import { targetCriteria } from "./judgments.js";

/** The dumspec Rules each paragraph of `targetCriteria` implements (system ADR 0037). */
export const targetCriteriaCitations: CitingPrompt = {
	name: "de/target-classification/targetCriteria",
	text: targetCriteria,
	paragraphs: [
		{
			opens: "Select the largest complete fixed",
			implements: [
				{ rule: "de/largest-fixed-unit", hash: "9a404db30f2b7c82" },
				{ rule: "de/fixed-members-only", hash: "f0bf57e9cd925985" },
			],
		},
		{
			opens: "German lexically selected nonreferential subject es",
			implements: [
				{
					rule: "de/expletive-es-joins-its-verb",
					hash: "33eaf0627366c786",
				},
			],
		},
		{
			opens: "A Lexeme may be discontinuous",
			implements: [
				{
					rule: "de/verb-owns-its-scattered-members",
					hash: "4e09a3e722ab1c82",
				},
				{
					rule: "de/governed-preposition-joins-its-governor",
					hash: "8f0eeeea8956479a",
				},
				{ rule: "de/copula-stays-apart", hash: "eddf44f6760331c0" },
				{
					rule: "de/pronominal-adverb-stands-alone",
					hash: "ed9c0c62153c7596",
				},
			],
		},
		{
			opens: "Modals (dürfen, können,",
			implements: [
				{ rule: "de/modal-is-a-verb", hash: "0f3e63e6bfa51754" },
				{ rule: "de/copula-stays-apart", hash: "eddf44f6760331c0" },
				{
					rule: "de/auxiliary-joins-the-verb-it-serves",
					hash: "17cec6bff2108a22",
				},
			],
		},
		{
			opens: "Perfect and passive complexes",
			implements: [
				{ rule: "de/verbal-participle", hash: "8783a18791f95718" },
				{ rule: "de/participial-adjective", hash: "64019b2928263509" },
				{ rule: "de/sein-perfect-or-copula", hash: "507adc4e3e41031f" },
				{
					rule: "de/attributive-adjective-stands-alone",
					hash: "293eb180d6782c36",
				},
				{ rule: "de/recipient-passive", hash: "0196915ee6d1a36d" },
				{ rule: "de/modal-is-a-verb", hash: "0f3e63e6bfa51754" },
				{
					rule: "de/funktionsverbgefuege-are-collocations",
					hash: "da5ad8e285adbe66",
				},
			],
		},
		{
			opens: "Fixed correlators include only anchors",
			implements: [
				{ rule: "de/correlator-anchors", hash: "677fbf6666284e28" },
				{ rule: "de/bare-infinitive-zu", hash: "7462675604e5cc7f" },
			],
		},
		{
			opens: "An established noncompositional expression",
			implements: [
				{ rule: "de/idiom", hash: "c05df428b3a42079" },
				{ rule: "de/fused-word-pieces", hash: "324792c72053f63b" },
				{
					rule: "de/abbreviation-is-one-segment",
					hash: "83496aec178971f1",
				},
				{ rule: "de/title-before-a-name", hash: "dd531115e2c8a2ef" },
				{ rule: "de/proper-noun-article", hash: "8f0c5d0f9338a32b" },
				{
					rule: "de/funktionsverbgefuege-are-collocations",
					hash: "da5ad8e285adbe66",
				},
			],
		},
		{
			opens: "Free substantive interrogatives",
			implements: [
				{ rule: "de/pron-or-det-by-use", hash: "bc1096b61ad7294d" },
				{
					rule: "de/possessive-after-article",
					hash: "be071df99f2242e6",
				},
				{ rule: "de/was-fuer", hash: "2f7aa9826f2670de" },
				{ rule: "de/adjective-stays-adj", hash: "9b5fe154ed54d6dc" },
				{
					rule: "de/attributive-adjective-stands-alone",
					hash: "293eb180d6782c36",
				},
			],
		},
		{
			opens: "German common nouns include",
			implements: [
				{ rule: "de/noun-owns-its-article", hash: "d7ab8e0ed8c0a5f4" },
				{
					rule: "de/only-der-and-ein-are-articles",
					hash: "7651166ee526ad94",
				},
				{
					rule: "de/shared-article-in-coordination",
					hash: "d21d49079359e0b8",
				},
				{ rule: "de/proper-noun-article", hash: "8f0c5d0f9338a32b" },
			],
		},
		{
			opens: "A target is defensible only",
			implements: [
				{ rule: "de/unresolved-over-repair", hash: "8379f464c655ba47" },
			],
		},
	],
};

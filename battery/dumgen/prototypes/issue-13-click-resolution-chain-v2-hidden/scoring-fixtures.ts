// Evaluator-side exact fixtures. Prompt construction must not import this.

import {
	HIDDEN_CLICK_CASES,
	type SelectionSurfaceGold,
} from "./corpus.hidden.ts";

export type MembershipOutput = Readonly<{
	surfaceSegmentIndices: readonly number[];
	selectedOrthography: "Standard" | "Typo";
}>;

export type GuardedNormalizationOutput = Readonly<{
	members: SelectionSurfaceGold["normalizedMembers"];
	spelling: "Canonical" | "Variant";
	realizationCoverage: "Full" | "Partial";
	surfaceKind: "Citation" | "Inflection";
	inflectionalFeatures: Readonly<Record<string, string>>;
}>;

export const EXPECTED_STRATUM_COUNTS = Object.freeze({
	"simple-citation": 1,
	"repeated-token-particle": 3,
	"clicked-or-nonclicked-typo": 2,
	"discontinuous-morpheme": 2,
	"partial-phraseme": 2,
	"non-phraseme-control": 1,
	"canonical-or-variant-spelling": 2,
	"citation-or-inflection": 2,
});

export const EXPECTED_GATE_COUNTS = Object.freeze({
	selectedOrthography: { Standard: 14, Typo: 1 },
	spelling: { Canonical: 14, Variant: 1 },
	realizationCoverage: { Full: 13, Partial: 2 },
	surfaceKind: { Citation: 9, Inflection: 6 },
});

export const PERFECT_SCORING_FIXTURES = Object.freeze(
	HIDDEN_CLICK_CASES.map((hiddenCase) =>
		Object.freeze({
			caseId: hiddenCase.id,
			selectionIdentity: Object.freeze({
				segmentedSentenceId: hiddenCase.sentence.id,
				clickedSegmentIndex: hiddenCase.clickedSegmentIndex,
			}),
			membershipExpected: Object.freeze({
				surfaceSegmentIndices: Object.freeze([
					...hiddenCase.gold.surfaceSegmentIndices,
				]),
				selectedOrthography: hiddenCase.gold.selectedOrthography,
			}),
			applicationAttestedSurface: hiddenCase.gold.attestedSurface,
			normalizationExpected: Object.freeze({
				members: Object.freeze(
					hiddenCase.gold.normalizedMembers.map((member) =>
						Object.freeze({ ...member }),
					),
				),
				normalizedSurface: hiddenCase.gold.normalizedSurface,
				spelling: hiddenCase.gold.spelling,
				realizationCoverage: hiddenCase.gold.realizationCoverage,
				surfaceKind: hiddenCase.gold.surfaceKind,
				inflectionalFeatures: Object.freeze({
					...hiddenCase.gold.inflectionalFeatures,
				}),
			}),
			entryKeyExpected: hiddenCase.gold.entry.key,
			forbiddenNormalizedSurfaces: Object.freeze([
				...hiddenCase.gold.forbiddenNormalizedSurfaces,
			]),
		}),
	),
);

export const RELATIONAL_SCORING_FIXTURES = Object.freeze([
	Object.freeze({
		id: "CRC2-REL-REPEATED-PARTICLE",
		caseIds: Object.freeze([
			"CRC2-REPEAT-001-VERB",
			"CRC2-REPEAT-002-GOVERNED",
			"CRC2-REPEAT-003-PARTICLE",
		]),
		rule: "verb clicks share [0,12]; governed index 6 resolves only [6]",
	}),
	Object.freeze({
		id: "CRC2-REL-CLICKED-ORTHOGRAPHY",
		caseIds: Object.freeze([
			"CRC2-TYPO-001-CLICKED",
			"CRC2-TYPO-002-NONCLICKED",
		]),
		rule: "same Surface; clicked typo is Typo and particle click is Standard",
	}),
	Object.freeze({
		id: "CRC2-REL-DISCONTINUOUS-MORPHEME",
		caseIds: Object.freeze([
			"CRC2-MORPH-001-PREFIX",
			"CRC2-MORPH-002-SUFFIX",
		]),
		rule: "both affix clicks share [6,8] and exclude stem index 7",
	}),
	Object.freeze({
		id: "CRC2-REL-PARTIAL-PHRASEME",
		caseIds: Object.freeze([
			"CRC2-PARTIAL-001-ADJECTIVE",
			"CRC2-PARTIAL-002-NOUN",
			"CRC2-CONTROL-001-ORDINARY-ADJECTIVE",
		]),
		rule: "idiom clicks share Partial multi-member Surface; control stays one-member Full",
	}),
	Object.freeze({
		id: "CRC2-REL-SPELLING",
		caseIds: Object.freeze([
			"CRC2-SPELLING-001-CANONICAL",
			"CRC2-SPELLING-002-VARIANT",
		]),
		rule: "same Entry; exact normalized forms preserve Canonical versus Variant",
	}),
	Object.freeze({
		id: "CRC2-REL-SURFACE-KIND",
		caseIds: Object.freeze([
			"CRC2-KIND-001-CITATION",
			"CRC2-KIND-002-INFLECTION",
		]),
		rule: "same Entry; sehen is Citation and sahen is Inflection",
	}),
]);

export const REJECTION_SCORING_FIXTURES = Object.freeze([
	Object.freeze({
		id: "CRC2-NEG-OMITS-CLICK",
		caseId: "CRC2-REPEAT-001-VERB",
		candidate: Object.freeze({
			surfaceSegmentIndices: Object.freeze([12]),
		}),
		expectedCategory: "invalid_membership",
	}),
	Object.freeze({
		id: "CRC2-NEG-GOVERNED-INFLATION",
		caseId: "CRC2-REPEAT-001-VERB",
		candidate: Object.freeze({
			surfaceSegmentIndices: Object.freeze([0, 6, 12]),
		}),
		expectedCategory: "membership_mismatch",
	}),
	Object.freeze({
		id: "CRC2-NEG-STEM-INFLATION",
		caseId: "CRC2-MORPH-001-PREFIX",
		candidate: Object.freeze({
			surfaceSegmentIndices: Object.freeze([6, 7, 8]),
		}),
		expectedCategory: "membership_mismatch",
	}),
	Object.freeze({
		id: "CRC2-NEG-INSERTION",
		caseId: "CRC2-PARTIAL-001-ADJECTIVE",
		candidate: Object.freeze({ normalizedSurface: "reinen Tisch machen" }),
		expectedCategory: "insertion_violation",
	}),
	Object.freeze({
		id: "CRC2-NEG-LEMMATIZATION",
		caseId: "CRC2-KIND-002-INFLECTION",
		candidate: Object.freeze({ normalizedSurface: "sehen" }),
		expectedCategory: "lemmatization_violation",
	}),
	Object.freeze({
		id: "CRC2-NEG-TYPO-PROPAGATION",
		caseId: "CRC2-TYPO-002-NONCLICKED",
		candidate: Object.freeze({ selectedOrthography: "Typo" }),
		expectedCategory: "orthography_mismatch",
	}),
	Object.freeze({
		id: "CRC2-NEG-VARIANT-ERASURE",
		caseId: "CRC2-SPELLING-002-VARIANT",
		candidate: Object.freeze({
			normalizedSurface: "Portemonnaie",
			spelling: "Canonical",
		}),
		expectedCategory: "variant_erasure",
	}),
]);

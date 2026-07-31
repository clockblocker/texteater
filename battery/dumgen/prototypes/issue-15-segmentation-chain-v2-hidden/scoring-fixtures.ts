// Evaluator-side fixtures. Prompt construction must not import this module.

import { createHash } from "node:crypto";
import {
	CORPUS_VERSION,
	HIDDEN_SEGMENTATION_CASES,
	type Segment,
	type SegmentKind,
} from "./corpus.hidden.ts";

export type CanonicalScoringResult =
	| Readonly<{
			decision: "UnsupportedLanguage" | "Unintelligible";
	  }>
	| Readonly<{
			decision: "Accepted";
			segmentedSentenceId: string;
			segments: readonly Readonly<
				Segment & {
					index: number;
					clickable: boolean;
				}
			>[];
	  }>;

export const EXPECTED_STRATUM_COUNTS = Object.freeze({
	"clean-german": 3,
	"german-boundaries": 4,
	"typo-or-variant-preservation": 4,
	"structural-reconstruction": 4,
	"partially-opaque": 3,
	unintelligible: 2,
	"unsupported-language": 2,
	"hebrew-fused-material": 4,
});

export const EXPECTED_DECISION_COUNTS = Object.freeze({
	Accepted: 22,
	UnsupportedLanguage: 2,
	Unintelligible: 2,
});

export const PERFECT_SCORING_FIXTURES = Object.freeze(
	HIDDEN_SEGMENTATION_CASES.map((hiddenCase) => {
		if (hiddenCase.gold.decision !== "Accepted") {
			return Object.freeze({
				caseId: hiddenCase.id,
				expected: Object.freeze({ decision: hiddenCase.gold.decision }),
			});
		}
		const stableInput = [
			CORPUS_VERSION,
			hiddenCase.id,
			JSON.stringify(hiddenCase.gold.segments),
		].join("\0");
		const segmentedSentenceId = `ss_${createHash("sha256")
			.update(stableInput)
			.digest("hex")
			.slice(0, 24)}`;
		return Object.freeze({
			caseId: hiddenCase.id,
			expected: Object.freeze({
				decision: "Accepted" as const,
				segmentedSentenceId,
				segments: Object.freeze(
					hiddenCase.gold.segments.map((segment, index) =>
						Object.freeze({
							...segment,
							index,
							clickable:
								segment.kind ===
								("ResolvableText" satisfies SegmentKind),
						}),
					),
				),
			}),
		});
	}),
);

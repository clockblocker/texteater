import type { SegmentedSentenceId, Selection } from "../../../../src/types";
import {
	englishGiveUpInflectionSurface,
	englishWalkCitationSurface,
	englishWalkInflectionSurface,
} from "./surfaces";

const walkSentenceId =
	"test:en:they-walk-home-together:v1" as SegmentedSentenceId;
const giveUpTypoSentenceId =
	"test:en:mark-gvae-up-on-it:v1" as SegmentedSentenceId;

// Attestation: "They [walk] home together."
export const englishWalkStandardFullSelection = {
	segmentedSentenceId: walkSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "walk",
	selectedOrthography: "Standard",
	surface: englishWalkInflectionSurface,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "They [walk] home together."
export const englishWalkCitationSelection = {
	segmentedSentenceId: walkSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2],
	attestedSurface: "walk",
	selectedOrthography: "Standard",
	surface: englishWalkCitationSurface,
} satisfies Selection<"en", "Citation", "Lexeme", "VERB">;

// Attestation: "Mark gvae [up] on it."
export const englishGiveUpClickedUpSelection = {
	segmentedSentenceId: giveUpTypoSentenceId,
	clickedSegmentIndex: 4,
	surfaceSegmentIndices: [2, 4],
	attestedSurface: "gvae up",
	selectedOrthography: "Standard",
	surface: englishGiveUpInflectionSurface,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

// Attestation: "Mark [gvae] up on it."
export const englishGiveUpClickedGvaeSelection = {
	segmentedSentenceId: giveUpTypoSentenceId,
	clickedSegmentIndex: 2,
	surfaceSegmentIndices: [2, 4],
	attestedSurface: "gvae up",
	selectedOrthography: "Typo",
	surface: englishGiveUpInflectionSurface,
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

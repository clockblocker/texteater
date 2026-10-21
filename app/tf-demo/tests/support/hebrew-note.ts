import type * as Dumling from "dumling/types";
import type { Id } from "../../convex/_generated/dataModel";

export const hebrewNoun = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "בַּיִת",
	coreFeatures: { abbr: null, gender: "Masc" },
} satisfies Dumling.Lemma<"he", "Lexeme", "NOUN">;

export function hebrewReadingNote() {
	const lemma = {
		...hebrewNoun,
		ownerKind: "Lemma" as const,
		ownerKey: "he-lemma-house",
		lemmaId: "he-lemma-house" as Id<"lemmas">,
	};
	return {
		kind: "Reading" as const,
		target: {
			kind: "Reading" as const,
			readingId: "he-reading-house" as Id<"readings">,
		},
		reading: {
			unitKind: "Reading" as const,
			ownerKind: "Reading" as const,
			ownerKey: "he-reading-house",
			readingId: "he-reading-house" as Id<"readings">,
			lemma,
			emojiDescription: "🏠",
		},
		knowledge: {
			definition: "מבנה המשמש למגורים.",
			translations: { en: ["house"], ru: ["дом"] },
			transcription: "ˈbajit",
		},
		knowledgeState: { status: "Full" as const, activity: "Idle" as const },
		knowledgeUpdatedAt: null,
		personalAnnotation: "",
		definitionText: { state: "Plain" as const },
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		participleLinks: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceContexts: {
			page: [
				{
					attestationId: "he-attestation-house" as Id<"attestations">,
					scrollId: "he-scroll" as Id<"scrolls">,
					sentencePosition: 0,
					sentenceSnippet: "ראיתי את הַבַּיִת.",
					segments: [
						{ kind: "ResolvableText" as const, text: "ראיתי" },
						{ kind: "Whitespace" as const, text: " " },
						{ kind: "ResolvableText" as const, text: "את" },
						{ kind: "Whitespace" as const, text: " " },
						{ kind: "ResolvableText" as const, text: "הַ" },
						{ kind: "ResolvableText" as const, text: "בַּיִת" },
						{ kind: "Punctuation" as const, text: "." },
					],
					memberSegmentIndices: [4, 5],
					memberTexts: ["הַ", "בַּיִת"],
					origin: { kind: "Scroll" as const },
					target: {
						kind: "Scroll" as const,
						scrollId: "he-scroll" as Id<"scrolls">,
						focusAttestationId:
							"he-attestation-house" as Id<"attestations">,
						title: "עברית בבית",
					},
				},
			],
			continueCursor: "",
			isDone: true,
		},
	};
}

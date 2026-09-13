import emojiRegex from "emoji-regex";
import type {
	LemmaReference,
	LexemeUnitShadow,
	LexicalUnitShadow,
	MorphemeReadingReference,
	ReadingReference,
	SemanticRelationGraph,
	UnitShadow,
} from "./types.js";

export function dumrelTrimString(value: string): string {
	return value.trim();
}

export function dumrelNormalizeNfc(value: string): string {
	return value.normalize("NFC");
}

export function retainNonEmptyArray<Value>(
	values: Value[],
): [Value, ...Value[]] {
	return values as [Value, ...Value[]];
}

export function retainAtLeastTwo<Value>(
	values: Value[],
): [Value, Value, ...Value[]] {
	return values as [Value, Value, ...Value[]];
}

export function bindLemmaReference(value: unknown): LemmaReference {
	return value as LemmaReference;
}

export function bindMorphemeReadingReference(
	value: ReadingReference,
): MorphemeReadingReference {
	return value as MorphemeReadingReference;
}

export function bindSupportedUnitShadow(value: {
	canonicalForm: string;
	family: string;
	kind: string;
	language: "de" | "en" | "he";
}): UnitShadow {
	return value as UnitShadow;
}

export function bindLexicalUnitShadow(value: UnitShadow): LexicalUnitShadow {
	return value as LexicalUnitShadow;
}

export function bindLexemeUnitShadow(value: UnitShadow): LexemeUnitShadow {
	return value as LexemeUnitShadow;
}

export function normalizeReadingLemma(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	const canonicalForm = Reflect.get(value, "canonicalForm");
	if (typeof canonicalForm !== "string") return value;
	return {
		...value,
		canonicalForm: canonicalForm.trim().normalize("NFC"),
	};
}

const MAX_EMOJI_GRAPHEMES = 4;
const standaloneEmojiModifierPattern = /^\p{Emoji_Modifier}$/u;
let singleEmojiPattern: RegExp | undefined;
let graphemeSegmenter: Intl.Segmenter | undefined;

function compactEmojiPattern(): RegExp {
	if (singleEmojiPattern === undefined) {
		singleEmojiPattern = new RegExp(`^(?:${emojiRegex().source})$`);
	}
	return singleEmojiPattern;
}

function emojiSegmenter(): Intl.Segmenter {
	if (graphemeSegmenter === undefined) {
		graphemeSegmenter = new Intl.Segmenter(undefined, {
			granularity: "grapheme",
		});
	}
	return graphemeSegmenter;
}

export function isCompactEmojiSequence(value: string): boolean {
	const graphemes = [...emojiSegmenter().segment(value)];
	const pattern = compactEmojiPattern();
	return (
		graphemes.length <= MAX_EMOJI_GRAPHEMES &&
		graphemes.every(
			({ segment }) =>
				pattern.test(segment) &&
				!standaloneEmojiModifierPattern.test(segment),
		)
	);
}

export function normalizeLemmaCanonicalForm(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	const canonicalForm = Reflect.get(value, "canonicalForm");
	if (typeof canonicalForm !== "string") return value;
	return {
		...value,
		canonicalForm: canonicalForm.trim().normalize("NFC"),
	};
}

export function isMorphemeReading(reading: {
	readonly lemma: { readonly family: string };
}): boolean {
	return reading.lemma.family === "Morpheme";
}

export function isLexicalUnitShadow(shadow: {
	readonly family: string;
}): boolean {
	return shadow.family === "Lexeme" || shadow.family === "Phraseme";
}

export function isLexemeUnitShadow(shadow: {
	readonly family: string;
}): boolean {
	return shadow.family === "Lexeme";
}

export function hasTranslationSelection(value: object): boolean {
	return Object.keys(value).length > 0;
}

export function hasSemanticRelationSelection(value: object): boolean {
	return Object.keys(value).length > 0;
}

export function semanticRelationGraphIssues(
	graph: SemanticRelationGraph,
): DumrelContextualIssue[] {
	const issues: DumrelContextualIssue[] = [];
	const readingOwners = new Map<string, string>();
	for (const [index, node] of graph.readings.entries()) {
		const existing = readingOwners.get(node.reading);
		if (existing !== undefined) {
			issues.push({
				code: "custom",
				path: ["readings", index, "reading"],
				message:
					existing === node.lemma
						? "Relation graph Reading identities must be unique."
						: "A relation graph Reading cannot belong to two Lemmas.",
			});
		}
		readingOwners.set(node.reading, node.lemma);
	}
	for (const [index, edge] of graph.edges.entries()) {
		if (!readingOwners.has(edge.sourceReading)) {
			issues.push({
				code: "custom",
				path: ["edges", index, "sourceReading"],
				message: "A relation edge source must be a declared Reading.",
			});
		}
	}
	return issues;
}

export type DumrelContextualIssue = {
	[key: string]: unknown;
	code: "custom";
	message: string;
	path: (number | string)[];
};

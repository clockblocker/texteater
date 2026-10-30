/**
 * The equivalents Luna writes as Translations (Dumrel, ADR 0055): the
 * structured-output schema that asks for each one's pieces, and the check
 * that reads them back. Two equivalents are one when their text is, the
 * pieces joined by a space; the first one's pieces stay. A Preposition with
 * no Slot right after it is read as a Slot: Luna labels a case-only object
 * (`радоваться` `чему-то`) a Preposition, and a preposition never ends a
 * Translation or comes before a word that is not its Slot (ADR 0055).
 */
import { isRecord } from "common-utils";
import { translationPieceKindValues, translationText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { InvalidModelOutput } from "../../errors.js";

/** One Translation: its pieces in reading order, never none. */
const translationOutputSchema = {
	type: "array",
	items: {
		type: "object",
		properties: {
			kind: { type: "string", enum: [...translationPieceKindValues] },
			text: { type: "string", minLength: 1 },
		},
		required: ["kind", "text"],
		additionalProperties: false,
	},
	minItems: 1,
} as const;

/** One to `max` Translations. */
export const translationsOutputSchema = (max: number) =>
	({
		type: "array",
		items: translationOutputSchema,
		minItems: 1,
		maxItems: max,
	}) as const;

const isPieceKind = (kind: unknown): kind is Dumrel.TranslationPieceKind =>
	translationPieceKindValues.some((known) => known === kind);

/** One equivalent's pieces, each trimmed, or undefined when it is none or a piece is empty. */
function translationOf(value: unknown): Dumrel.Translation | undefined {
	if (!Array.isArray(value)) return undefined;
	const pieces: Dumrel.TranslationPiece[] = [];
	for (const piece of value) {
		if (
			!isRecord(piece) ||
			!isPieceKind(piece.kind) ||
			typeof piece.text !== "string"
		)
			return undefined;
		const text = piece.text.trim();
		if (text === "") return undefined;
		pieces.push({ kind: piece.kind, text });
	}
	return pieces.length > 0 ? withSlotsRelabelled(pieces) : undefined;
}

/** Each Preposition with no Slot right after it, relabelled a Slot. */
function withSlotsRelabelled(
	pieces: readonly Dumrel.TranslationPiece[],
): Dumrel.Translation {
	return pieces.map((piece, index) =>
		piece.kind === "Preposition" && pieces[index + 1]?.kind !== "Slot"
			? { kind: "Slot", text: piece.text }
			: piece,
	);
}

/**
 * The Translations Luna answered, each once by its text, in its order; an
 * answer that is no array of them, or holds more than `max`, is unusable.
 */
export function translationsOf(
	stage: string,
	output: unknown,
	max: number,
): Dumrel.Translation[] | InvalidModelOutput {
	const unusable = (message: string) =>
		new InvalidModelOutput({ stage, message });
	if (!Array.isArray(output))
		return unusable(
			`Luna answered no array of translations: ${JSON.stringify(output)?.slice(0, 80)}`,
		);
	const seen = new Set<string>();
	const translations: Dumrel.Translation[] = [];
	for (const value of output) {
		const translation = translationOf(value);
		if (translation === undefined)
			return unusable(
				`Luna answered a translation that is no list of pieces: ${JSON.stringify(value)?.slice(0, 80)}`,
			);
		const text = translationText(translation);
		if (seen.has(text)) continue;
		seen.add(text);
		translations.push(translation);
	}
	if (translations.length === 0)
		return unusable("Luna answered no translation");
	if (translations.length > max)
		return unusable(`Luna answered ${translations.length}, past ${max}`);
	return translations;
}

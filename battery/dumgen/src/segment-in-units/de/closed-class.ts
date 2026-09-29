/**
 * Closed-class identity for German uninflected function words (PART, CCONJ,
 * SCONJ, ADV, INTJ), from the #734 rulings. Filled in when the rulings are
 * posted; until then no piece gets a question.
 */
import type { RouteKey } from "./routes.js";
import type { Piece } from "./sentence.js";

export type ClosedClassQuestion = {
	readonly instructions: (piece: string) => string;
	readonly criteria: Readonly<Record<string, string>>;
};

export function closedClassQuestion(
	_piece: Piece,
): ClosedClassQuestion | undefined {
	return undefined;
}

export function closedClassRoute(
	_piece: Piece,
	_choice: string,
): RouteKey | undefined {
	return undefined;
}

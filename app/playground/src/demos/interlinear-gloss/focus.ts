import type { ReactNode } from "react";
import {
	abbreviations,
	type Column,
	type GlossCase,
	type LemmaPiece,
	unitOf,
} from "./cases";

/**
 * Which word has the focus, and what it lights: a column of the clicked
 * words or a piece of the lemma, written `c:<id>` or `l:<id>`. The focus
 * lights the column, the pieces it becomes in the lemma and the line
 * between them; a lemma piece lights the pieces it came from.
 */

export type GlossStyle = "leipzig" | "spelled" | "plain";

/** One line of the alignment: piece `index` of `column` becomes `to`. */
export type Link = {
	readonly key: string;
	readonly column: string;
	readonly index: number;
	readonly to: string;
};

export type Lit = {
	readonly columns: ReadonlySet<string>;
	readonly lemma: ReadonlySet<string>;
	readonly links: ReadonlySet<string>;
	/** Clause columns a lit word stands in for. */
	readonly referents: ReadonlySet<string>;
};

export const columnKey = (id: string) => `c:${id}`;
export const lemmaKey = (id: string) => `l:${id}`;

/** Every line from the clicked words to the lemma. */
export function linksOf(glossCase: GlossCase): Link[] {
	return unitOf(glossCase).flatMap((column) =>
		column.pieces.flatMap((piece, index) =>
			(piece.to ?? []).map((to) => ({
				key: `${column.id}:${index}>${to}`,
				column: column.id,
				index,
				to,
			})),
		),
	);
}

export function litBy(glossCase: GlossCase, focus: string | null): Lit {
	const links = linksOf(glossCase);
	const id = focus?.slice(2) ?? "";
	const shown = focus?.startsWith("c:")
		? links.filter((link) => link.column === id)
		: focus?.startsWith("l:")
			? links.filter((link) => link.to === id)
			: [];
	const columns = new Set(shown.map((link) => link.column));
	if (focus?.startsWith("c:")) columns.add(id);
	const lemma = new Set(shown.map((link) => link.to));
	if (focus?.startsWith("l:")) lemma.add(id);
	const referents = new Set(
		glossCase.clause
			.filter((column) => columns.has(column.id))
			.flatMap((column) => column.refersTo ?? []),
	);
	return {
		columns,
		lemma,
		links: new Set(shown.map((link) => link.key)),
		referents,
	};
}

/** What the focused word explains, and the labels its gloss uses. */
export type FocusNote = {
	readonly word: string;
	readonly lemma: boolean;
	readonly note: ReactNode;
	readonly labels: readonly string[];
};

export function noteFor(
	glossCase: GlossCase,
	focus: string | null,
): FocusNote | null {
	if (!focus) return null;
	const id = focus.slice(2);
	if (focus.startsWith("l:")) {
		const piece = glossCase.lemma.pieces.find((each) => each.id === id);
		if (!piece) return null;
		if (piece.note)
			return {
				word: piece.text,
				lemma: true,
				note: piece.note,
				labels: labelsIn(piece.leipzig),
			};
		// A lemma piece with no note of its own explains where it came from.
		const from = linksOf(glossCase).find((link) => link.to === id);
		return from ? noteFor(glossCase, columnKey(from.column)) : null;
	}
	const column = glossCase.clause.find((each) => each.id === id);
	return column?.note
		? {
				word: column.word,
				lemma: false,
				note: column.note,
				labels: column.pieces.flatMap((piece) =>
					labelsIn(piece.leipzig),
				),
			}
		: null;
}

/** Every note the case has, the clicked words' first, then the lemma's. */
export function notesOf(glossCase: GlossCase): {
	readonly key: string;
	readonly word: string;
	readonly note: ReactNode;
}[] {
	const fromColumns = unitOf(glossCase).flatMap((column: Column) =>
		column.note
			? [
					{
						key: columnKey(column.id),
						word: column.word,
						note: column.note,
					},
				]
			: [],
	);
	const fromLemma = glossCase.lemma.pieces.flatMap((piece: LemmaPiece) =>
		piece.note
			? [{ key: lemmaKey(piece.id), word: piece.text, note: piece.note }]
			: [],
	);
	return [...fromColumns, ...fromLemma];
}

/** A Leipzig gloss cut into its words and labels, delimiters kept. */
export function glossParts(
	gloss: string,
): { readonly text: string; readonly label?: string }[] {
	return gloss
		.split(/([-./()[\]])/u)
		.filter((part) => part !== "")
		.map((part) => {
			const meaning = abbreviations[part];
			return meaning ? { text: part, label: meaning } : { text: part };
		});
}

/** The labels a gloss uses, once each, in order. */
export function labelsIn(gloss: string): string[] {
	return [
		...new Set(
			glossParts(gloss).flatMap((part) =>
				part.label ? [part.text] : [],
			),
		),
	];
}

/** Every label the case's glosses use, for its list of abbreviations. */
export function labelsOf(glossCase: GlossCase): string[] {
	const glosses = [
		...glossCase.clause.flatMap((column) =>
			column.pieces.map((piece) => piece.leipzig),
		),
		...glossCase.lemma.pieces.map((piece) => piece.leipzig),
	];
	return [...new Set(glosses.flatMap(labelsIn))].sort();
}

import type { ReactNode } from "react";
import { abbreviations, type Column, type Step, type Target } from "./model";

/**
 * Which token of a step has the focus, and what it lights: a column of
 * the top row or a target of the line it lands on, written `c:<id>` or
 * `t:<id>`. A column lights itself, its lines and where they land; a
 * target lights the lines that land on it and where they came from.
 */

export type GlossStyle = "leipzig" | "spelled" | "plain";

/** One line of the gloss: piece `index` of `column` lands on `to`. */
export type Link = {
	readonly key: string;
	readonly column: string;
	readonly index: number;
	readonly to: string;
};

export type Lit = {
	readonly columns: ReadonlySet<string>;
	readonly targets: ReadonlySet<string>;
	readonly links: ReadonlySet<string>;
	/** Columns whose dropping-out stub is lit. */
	readonly drops: ReadonlySet<string>;
	/** The sentence's words a lit column stands in for. */
	readonly referents: ReadonlySet<string>;
};

export const columnKey = (id: string) => `c:${id}`;
export const targetKey = (id: string) => `t:${id}`;

/** Every line from the step's columns to its targets. */
export function linksOf(step: Step): Link[] {
	return step.columns.flatMap((column) =>
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

export function litBy(step: Step, focus: string | null): Lit {
	const links = linksOf(step);
	const id = focus?.slice(2) ?? "";
	const onColumn = focus?.startsWith("c:") ?? false;
	const onTarget = focus?.startsWith("t:") ?? false;
	const shown = links.filter((link) =>
		onColumn ? link.column === id : onTarget && link.to === id,
	);
	const columns = new Set(shown.map((link) => link.column));
	if (onColumn) columns.add(id);
	const targets = new Set(shown.map((link) => link.to));
	if (onTarget) targets.add(id);
	const lit = step.columns.filter((column) => columns.has(column.id));
	return {
		columns,
		targets,
		links: new Set(shown.map((link) => link.key)),
		drops: new Set(
			lit.filter((column) => column.drops).map((column) => column.id),
		),
		referents: new Set(lit.flatMap((column) => column.refersTo ?? [])),
	};
}

/** What the focused token explains, and the labels its gloss uses. */
export type FocusNote = {
	readonly word: string;
	readonly note: ReactNode;
	readonly labels: readonly string[];
};

export function noteFor(step: Step, focus: string | null): FocusNote | null {
	if (!focus) return null;
	const id = focus.slice(2);
	if (focus.startsWith("t:")) {
		const target = step.targets.find((each) => each.id === id);
		if (!target) return null;
		if (target.note)
			return { word: target.text, note: target.note, labels: [] };
		// A target with no note of its own explains where it came from.
		const from = linksOf(step).find((link) => link.to === id);
		return from ? noteFor(step, columnKey(from.column)) : null;
	}
	const column = step.columns.find((each) => each.id === id);
	return column?.note
		? {
				word: column.word,
				note: column.note,
				labels: column.pieces.flatMap((piece) =>
					labelsIn(piece.leipzig),
				),
			}
		: null;
}

/** Every note the step has, its columns' first, then its targets'. */
export function notesOf(step: Step): {
	readonly key: string;
	readonly word: string;
	readonly note: ReactNode;
}[] {
	const fromColumns = step.columns.flatMap((column: Column) =>
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
	const fromTargets = step.targets.flatMap((target: Target) =>
		target.note
			? [
					{
						key: targetKey(target.id),
						word: target.text,
						note: target.note,
					},
				]
			: [],
	);
	return [...fromColumns, ...fromTargets];
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

/** Every label the step's glosses use, for its list of abbreviations. */
export function labelsOf(step: Step): string[] {
	return [
		...new Set(
			step.columns.flatMap((column) =>
				column.pieces.flatMap((piece) => labelsIn(piece.leipzig)),
			),
		),
	].sort();
}

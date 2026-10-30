import { NoteSection } from "lego";
import { createContext, Fragment, type ReactNode, useContext } from "react";

import type { ReadingDefaultRenderer } from "../../../../universal/blocks/renderer";
import {
	DEFAULT_VALENCY_LINE_STYLE,
	germanValencyLine,
	type ValencyLinePart,
	type ValencyLineStyle,
} from "./valency-line";

/**
 * The line's style, which the Playground's inspector varies to compare
 * where the reflexive goes (#1285). The app always reads the default.
 */
export const ValencyLineStyleContext = createContext<ValencyLineStyle>(
	DEFAULT_VALENCY_LINE_STYLE,
);

/**
 * The German Valency Block: the Lemma with its Reading's Valency Frame, as in
 * `>passen (auf jN) auf<`. A Reading without a frame has no block.
 */
export const renderDeReadingValency = (({ noteData }) => (
	<ValencyBlock
		lemma={noteData.reading.lemma}
		frame={noteData.knowledge.valency}
	/>
)) satisfies ReadingDefaultRenderer;

function ValencyBlock({
	lemma,
	frame,
}: {
	readonly lemma: Parameters<typeof germanValencyLine>[0] & {
		readonly language: string;
	};
	readonly frame: Parameters<typeof germanValencyLine>[1];
}) {
	const style = useContext(ValencyLineStyleContext);
	const parts = germanValencyLine(lemma, frame, style);
	if (!parts) return null;

	return (
		<NoteSection aria-label="Valency" label="Valency">
			<p data-slot="valency-line" lang={lemma.language}>
				<ValencyLineParts parts={parts} />
			</p>
		</NoteSection>
	);
}

/** A Valency Line's parts, spaced, as the Valency Block and the heading print them. */
export function ValencyLineParts({
	parts,
}: {
	readonly parts: readonly ValencyLinePart[];
}) {
	return parts.map((part, index) => (
		<Fragment key={`${index}:${part.part}`}>
			{index > 0 ? " " : null}
			{renderPart(part)}
		</Fragment>
	));
}

function renderPart(part: ValencyLinePart): ReactNode {
	switch (part.part) {
		case "Head":
			if (part.separable)
				return (
					<>
						<SplitMark>&gt;</SplitMark>
						{part.text}
					</>
				);
			return part.prefix ? (
				<AttachedPrefix prefix={part.prefix} verb={part.text} />
			) : (
				part.text
			);
		case "Reflexive": {
			const reflexive = (
				<>
					{part.text}
					{part.case ? (
						<>
							{" "}
							<span
								data-slot="valency-reflexive-case"
								className="text-[0.8em] text-ink-muted"
							>
								({part.case})
							</span>
						</>
					) : null}
				</>
			);
			return part.optional ? <Optional>{reflexive}</Optional> : reflexive;
		}
		case "Fixed":
			return part.text;
		case "Slot": {
			const slot = (
				<>
					{part.preposition ? `${part.preposition} ` : null}
					<span
						data-slot="valency-token"
						className="font-mono text-[0.9em] text-ink-soft"
					>
						{part.token}
					</span>
				</>
			);
			return part.optional ? <Optional>{slot}</Optional> : slot;
		}
		case "SeparatedPrefix":
			return (
				<>
					{part.text}
					<SplitMark>&lt;</SplitMark>
				</>
			);
	}
}

/** An Optional Slot, in muted parentheses. */
function Optional({ children }: { readonly children: ReactNode }) {
	return (
		<>
			<span className="text-ink-muted">(</span>
			{children}
			<span className="text-ink-muted">)</span>
		</>
	);
}

/** A separable verb's split: `>` before the base, `<` after the prefix. */
function SplitMark({ children }: { readonly children: ReactNode }) {
	return (
		<span data-slot="valency-split" className="text-ink-muted">
			{children}
		</span>
	);
}

/** A separable prefix still on its verb, split off by a muted bar: `auf|passen`. */
export function AttachedPrefix({
	prefix,
	verb,
}: {
	readonly prefix: string;
	readonly verb: string;
}) {
	return (
		<>
			{prefix}
			<span className="text-ink-muted">|</span>
			{verb.slice(prefix.length)}
		</>
	);
}

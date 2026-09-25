import { NoteSection } from "lego";
import { Fragment, type ReactNode } from "react";

import type { ReadingDefaultRenderer } from "../../../../universal/blocks/renderer";
import { germanValencyLine, type ValencyLinePart } from "./valency-line";

/**
 * The German Valency Block: the Lemma with its Reading's Valency Frame, as in
 * `>passen (auf jN/etw) auf<`. A Reading without a frame has no block.
 */
export const renderDeReadingValency = (({ noteData }) => {
	const { lemma } = noteData.reading;
	const parts = germanValencyLine(lemma, noteData.knowledge.valency);
	if (!parts) return null;

	return (
		<NoteSection aria-label="Valency" label="Valency">
			<p data-slot="valency-line" lang={lemma.language}>
				{parts.map((part, index) => (
					<Fragment key={partKey(part)}>
						{index > 0 ? " " : null}
						{renderPart(part)}
					</Fragment>
				))}
			</p>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;

function renderPart(part: ValencyLinePart): ReactNode {
	switch (part.part) {
		case "Head":
			return part.separable ? (
				<>
					<SplitMark>&gt;</SplitMark>
					{part.text}
				</>
			) : (
				part.text
			);
		case "Reflexive":
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
			return part.optional ? (
				<>
					<span className="text-ink-muted">(</span>
					{slot}
					<span className="text-ink-muted">)</span>
				</>
			) : (
				slot
			);
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

/** A separable verb's split: `>` before the base, `<` after the prefix. */
function SplitMark({ children }: { readonly children: ReactNode }) {
	return (
		<span data-slot="valency-split" className="text-ink-muted">
			{children}
		</span>
	);
}

function partKey(part: ValencyLinePart): string {
	return part.part === "Slot"
		? `Slot:${part.preposition ?? ""}:${part.case}:${part.token}`
		: part.part;
}

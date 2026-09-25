import { NoteSection } from "lego";
import { Fragment } from "react";

import type { ReadingDefaultRenderer } from "../../../../universal/blocks/renderer";
import {
	readingSourceContextsRenderer,
	type SourceContextCaption,
} from "../../../../universal/blocks/renderers/reading/source-contexts/default";
import {
	type AdpositionLinePart,
	germanAdpositionLine,
	germanRealizedCaseMark,
} from "./adposition-line";

/**
 * The German ADP Valency Block: the adposition with its complement and the
 * cases the ADP Case Table allows, as in `` auf `etw` · Akk: wohin? · Dat: wo? ``.
 * An adposition the table does not list has no block.
 */
export const renderDeAdpositionValency = (({ noteData }) => {
	const { lemma } = noteData.reading;
	const line = germanAdpositionLine(lemma);
	if (!line) return null;

	return (
		<NoteSection aria-label="Valency" label="Valency">
			<p data-slot="valency-line" lang={lemma.language}>
				{line.parts.map((part, index) => (
					<Fragment key={`${part.part}:${part.text}`}>
						{index > 0 ? " " : null}
						{renderPart(part)}
					</Fragment>
				))}
				{line.cases.map((note) => (
					<span key={note.label} data-slot="valency-case">
						<span className="text-ink-muted"> · </span>
						{note.gloss
							? `${note.label}: ${note.gloss}`
							: note.label}
					</span>
				))}
			</p>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;

function renderPart(part: AdpositionLinePart) {
	return part.part === "Token" ? (
		<span
			data-slot="valency-token"
			className="font-mono text-[0.9em] text-ink-soft"
		>
			{part.text}
		</span>
	) : (
		part.text
	);
}

/** Each ADP Source Context shows the case its complement took. */
const realizedCaseCaption: SourceContextCaption = (sourceContext, lemma) =>
	sourceContext.realizedCase ? (
		<p
			data-slot="realized-case"
			className="mt-1 text-sm text-ink-muted"
			lang={lemma.language}
		>
			{germanRealizedCaseMark(lemma, sourceContext.realizedCase)}
		</p>
	) : null;

export const renderDeAdpositionSourceContexts =
	readingSourceContextsRenderer(realizedCaseCaption);

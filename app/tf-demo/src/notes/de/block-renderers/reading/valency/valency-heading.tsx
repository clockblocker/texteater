import { createContext, Fragment, type ReactNode, useContext } from "react";
import {
	type CitationPart,
	citedNoteReading,
} from "../../../../universal/blocks/citation";
import type { ReadingDefaultRenderer } from "../../../../universal/blocks/renderer";
import { ReadingHeading } from "../../../../universal/blocks/renderers/reading/heading/default";
import {
	ValencyPreposition,
	ValencySlot,
} from "../../../../universal/blocks/valency-pieces";
import {
	DEFAULT_VALENCY_LINE_STYLE,
	germanValencyLine,
	type SlotAlternative,
	type ValencyLinePart,
	type ValencyLineStyle,
} from "./valency-line";

type ReadingContext = Parameters<ReadingDefaultRenderer>[0];

/**
 * The line's style, which the Playground's inspector varies to compare
 * which case the reflexive names (#1285). The app always reads the default.
 */
export const ValencyLineStyleContext = createContext<ValencyLineStyle>(
	DEFAULT_VALENCY_LINE_STYLE,
);

/**
 * A valent Reading's heading: its emoji and its German Valency Line,
 * `mit jM zu tun haben`. While the frame shows nothing it falls back to
 * `fallback`, or to the bare Citation.
 */
export function ValencyHeading({
	context: { noteData, PresentationCapabilities, Citation },
	lead,
	fallback,
}: {
	readonly context: ReadingContext;
	/** Printed before the line, as a noun's articles are. */
	readonly lead?: ReactNode;
	readonly fallback?: (citation: readonly CitationPart[]) => ReactNode;
}) {
	const style = useContext(ValencyLineStyleContext);
	const citation = Citation(citedNoteReading(noteData));
	const parts = germanValencyLine(
		noteData.reading.lemma,
		noteData.knowledge.valency,
		style,
	);
	return (
		<ReadingHeading
			note={noteData}
			capabilities={PresentationCapabilities}
			citation={citation}
			title={
				parts ? (
					<>
						{lead}
						<ValencyLineView parts={parts} />
					</>
				) : (
					fallback?.(citation)
				)
			}
		/>
	);
}

/**
 * A Valency Line's parts as the heading prints them: a slot and its
 * preposition in the valency styles, an Optional one in parentheses, a
 * separable prefix split off by a bar. A Surface's line prints the same.
 */
export function ValencyLineView({
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
		case "Preposition":
			return <ValencyPreposition>{part.text}</ValencyPreposition>;
		case "Slot": {
			const slot = part.alternatives.map((alternative, index) => (
				<Fragment key={`${index}:${alternative.kind}`}>
					{index > 0 ? (
						<span className="font-normal text-ink-muted">
							{" | "}
						</span>
					) : null}
					{renderAlternative(alternative)}
				</Fragment>
			));
			if (part.optional) return <Optional>{slot}</Optional>;
			return part.alternatives.length > 1 ? (
				<RequiredAlternatives>{slot}</RequiredAlternatives>
			) : (
				slot
			);
		}
	}
}

function renderAlternative(alternative: SlotAlternative): ReactNode {
	switch (alternative.kind) {
		case "Case":
			return (
				<>
					{alternative.preposition ? (
						<>
							<ValencyPreposition>
								{alternative.preposition}
							</ValencyPreposition>{" "}
						</>
					) : null}
					<ValencySlot>{alternative.token}</ValencySlot>
				</>
			);
		case "Placeholder":
			return (
				<>
					{alternative.marker ? (
						<>
							<ValencyPreposition>
								{alternative.marker}
							</ValencyPreposition>{" "}
						</>
					) : null}
					<ValencySlot variant="placeholder">
						{alternative.text}
					</ValencySlot>
				</>
			);
	}
}

/** An Optional Slot, in muted parentheses. */
function Optional({ children }: { readonly children: ReactNode }) {
	return (
		<>
			<span className="font-normal text-ink-muted">(</span>
			{children}
			<span className="font-normal text-ink-muted">)</span>
		</>
	);
}

/** Required alternatives in one Slot, in muted square brackets. */
function RequiredAlternatives({ children }: { readonly children: ReactNode }) {
	return (
		<>
			<span className="font-normal text-ink-muted">[</span>
			{children}
			<span className="font-normal text-ink-muted">]</span>
		</>
	);
}

/** A separable prefix on its verb, split off by a muted bar: `auf|passen`. */
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

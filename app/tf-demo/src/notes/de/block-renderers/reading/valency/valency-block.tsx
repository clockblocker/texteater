import { NoteList, NoteSection } from "lego";
import {
	createContext,
	Fragment,
	type ReactNode,
	useContext,
	useState,
} from "react";
import type { ReadingDefaultRenderer } from "../../../../universal/blocks/renderer";
import {
	ValencyPreposition,
	ValencySlot,
} from "../../../../universal/blocks/valency-pieces";
import {
	DEFAULT_VALENCY_LINE_STYLE,
	germanValencyPatternLine,
	type PatternComplementView,
	type ValencyLinePart,
	type ValencyLineStyle,
	valencyLineText,
} from "./valency-line";

/** Show up to 4 accumulated patterns before folding the rest behind `Show N more`. */
const FOLDED_AFTER = 4;

/**
 * The line's style, which the Playground's inspector varies to compare
 * which case the reflexive names (#1285). The app always reads the default.
 */
export const ValencyLineStyleContext = createContext<ValencyLineStyle>(
	DEFAULT_VALENCY_LINE_STYLE,
);

/**
 * The German Reading Valency Block (ADR 0034): lists each concrete Valency
 * Pattern the learner has encountered for this Reading as a bullet item
 * (`• jN fragen`, `• nach jM fragen`, `• darauf, dass … achten`), folding
 * long lists behind `Show N more`. Returns `null` when no pattern carries
 * a governed complement or lexical reflexive.
 */
export const renderDeReadingValency = ((context) => (
	<ReadingValencyBlock context={context} />
)) satisfies ReadingDefaultRenderer;

type ReadingContext = Parameters<ReadingDefaultRenderer>[0];

function ReadingValencyBlock({
	context: { noteData },
}: {
	readonly context: ReadingContext;
}) {
	const style = useContext(ValencyLineStyleContext);
	const [open, setOpen] = useState(false);
	const { lemma, emojiDescription } = noteData.reading;
	const patterns = noteData.knowledge.valency ?? [];
	const lines: {
		readonly key: string;
		readonly parts: readonly ValencyLinePart[];
	}[] = [];
	const seen = new Set<string>();
	for (const pattern of patterns) {
		const parts = germanValencyPatternLine(
			lemma,
			pattern,
			style,
			emojiDescription,
		);
		if (!parts) continue;
		const key = valencyLineText(parts);
		if (seen.has(key)) continue;
		seen.add(key);
		lines.push({ key, parts });
	}
	if (lines.length === 0) return null;

	const folded = lines.length - FOLDED_AFTER;
	const shown = open || folded <= 0 ? lines : lines.slice(0, FOLDED_AFTER);

	return (
		<NoteSection label="Valency">
			<NoteList
				gap="tight"
				className="list-disc ps-4 marker:text-ink-faint"
			>
				{shown.map(({ key, parts }) => (
					<li
						key={key}
						data-slot="valency-pattern"
						lang={lemma.language}
					>
						<ValencyLineView parts={parts} />
					</li>
				))}
			</NoteList>
			{folded > 0 ? (
				<button
					type="button"
					aria-expanded={open}
					className="mt-1 cursor-pointer rounded-sm px-1 text-[length:var(--note-aside-size,0.875rem)] tabular-nums text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					onClick={() => setOpen(!open)}
				>
					{open ? "Show less" : `Show ${folded} more`}
				</button>
			) : null}
		</NoteSection>
	);
}

/**
 * A Valency Pattern line's (or Surface line's) parts as rendered: a
 * complement and its preposition in the valency styles, a separable prefix
 * split off by a muted bar.
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
		case "Reflexive":
			return (
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
		case "Fixed":
			return part.text;
		case "Preposition":
			return <ValencyPreposition>{part.text}</ValencyPreposition>;
		case "Complement":
			return renderComplement(part.complement);
	}
}

function renderComplement(complement: PatternComplementView): ReactNode {
	switch (complement.kind) {
		case "Case":
			return (
				<>
					{complement.preposition ? (
						<>
							<ValencyPreposition>
								{complement.preposition}
							</ValencyPreposition>{" "}
						</>
					) : null}
					<ValencySlot>{complement.token}</ValencySlot>
				</>
			);
		case "Placeholder":
			return (
				<>
					{complement.marker ? (
						<>
							<ValencyPreposition>
								{complement.marker}
							</ValencyPreposition>{" "}
						</>
					) : null}
					<ValencySlot variant="placeholder">
						{complement.text}
					</ValencySlot>
				</>
			);
	}
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

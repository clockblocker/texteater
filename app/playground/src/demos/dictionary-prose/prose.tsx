import { cn } from "lego";
import { Fragment, type ReactNode, useState } from "react";
import { langAttrs } from "@/fixtures";
import {
	type LemmaId,
	lemmas,
	type ProseCase,
	type Run,
	type TermId,
	terms,
	type WordLine,
} from "./cases";

/** The design's open choices, which the inspector varies. */
export type ProseOptions = {
	/** Grammar terms in English (Wiktionary) or German (DWDS). */
	readonly terms: "en" | "de";
	/** One line per word, Wiktionary's form-of lines, or one paragraph. */
	readonly layout: "lines" | "paragraph";
	/** Whether a word the lemma keeps as it is gets a line too. */
	readonly unchanged: boolean;
	/** Whether a grammar term opens its definition on a tap. */
	readonly hints: boolean;
	/** Only the form-of lines, without the sentences after them. */
	readonly brief: boolean;
};

export const defaultProseOptions: ProseOptions = {
	terms: "en",
	layout: "lines",
	unchanged: true,
	hints: true,
	brief: false,
};

/**
 * How the clicked words become the lemma, as a dictionary says it: per
 * word, en.wiktionary's form-of line (`third-person singular preterite of
 * haben`), then a sentence or two on what the form does here, then the
 * unit put back in dictionary order. No notation: grammar terms are words,
 * and each opens its definition on a tap.
 */
export function Prose({
	prose,
	options,
	onLemma,
}: {
	readonly prose: ProseCase;
	readonly options: ProseOptions;
	readonly onLemma: (id: LemmaId) => void;
}) {
	// One open definition at a time, keyed by where its term stands.
	const [openHint, setOpenHint] = useState<string | null>(null);
	const lines = prose.lines.filter(
		(line) => line.changed || options.unchanged,
	);
	const runs = (scope: string, shown: readonly Run[]) => (
		<Runs
			runs={shown}
			scope={scope}
			options={options}
			openHint={openHint}
			onHint={(key) => setOpenHint((open) => (open === key ? null : key))}
			onLemma={onLemma}
		/>
	);
	const hintIn = (scope: string) =>
		openHint?.startsWith(`${scope}:`) ? (
			<Hint term={openHint.split(":")[2] as TermId} options={options} />
		) : null;

	if (options.layout === "paragraph")
		return (
			<div {...langAttrs("en")} className="grid gap-2 leading-relaxed">
				<p>
					{lines.map((line, index) => (
						<Fragment key={line.word}>
							{index > 0 ? " " : null}
							<Word line={line} /> {line.is}{" "}
							{runs(`p${index}`, line.formOf)}.
							{options.brief || line.note.length === 0 ? null : (
								<span className="text-ink-soft">
									{" "}
									{runs(`n${index}`, line.note)}
								</span>
							)}
						</Fragment>
					))}
					{prose.together ? (
						<span className="text-ink-soft">
							{" "}
							{runs("t", prose.together)}
						</span>
					) : null}
				</p>
				{lines.map((_, index) => (
					<Fragment key={index}>
						{hintIn(`p${index}`)}
						{hintIn(`n${index}`)}
					</Fragment>
				))}
				{hintIn("t")}
			</div>
		);

	return (
		<div {...langAttrs("en")} className="grid gap-3">
			<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5">
				{lines.map((line, index) => (
					<Fragment key={line.word}>
						<dt className="leading-relaxed">
							<Word line={line} />
						</dt>
						<dd className="grid min-w-0 gap-0.5 leading-relaxed">
							<span>{runs(`p${index}`, line.formOf)}</span>
							{hintIn(`p${index}`)}
							{options.brief || line.note.length === 0 ? null : (
								<span className="text-ink-soft">
									{runs(`n${index}`, line.note)}
								</span>
							)}
							{hintIn(`n${index}`)}
						</dd>
					</Fragment>
				))}
			</dl>
			{prose.together ? (
				<p className="leading-relaxed text-ink-soft">
					{runs("t", prose.together)}
					{hintIn("t")}
				</p>
			) : null}
		</div>
	);
}

/** The clicked word a line is about, as a dictionary sets its headword. */
function Word({ line }: { readonly line: WordLine }) {
	return (
		<b
			{...langAttrs("de")}
			className={cn(
				"font-semibold whitespace-nowrap",
				line.changed ? "text-ink" : "text-ink-soft",
			)}
		>
			{line.word}
		</b>
	);
}

function Runs({
	runs,
	scope,
	options,
	openHint,
	onHint,
	onLemma,
}: {
	readonly runs: readonly Run[];
	readonly scope: string;
	readonly options: ProseOptions;
	readonly openHint: string | null;
	readonly onHint: (key: string) => void;
	readonly onLemma: (id: LemmaId) => void;
}) {
	return runs.map((run, index) => {
		const key = `${index}`;
		if (typeof run === "string")
			return <Fragment key={key}>{run}</Fragment>;
		if ("de" in run)
			return (
				<i key={key} {...langAttrs("de")} className="whitespace-nowrap">
					{run.de}
				</i>
			);
		if ("gloss" in run) return <Fragment key={key}>‘{run.gloss}’</Fragment>;
		if ("slot" in run) return <Slot key={key} token={run.slot} />;
		if ("link" in run)
			return (
				<LemmaLink
					key={key}
					id={run.link}
					text={run.text}
					onClick={() => onLemma(run.link)}
				/>
			);
		const word = terms[run.term][options.terms];
		const hintKey = `${scope}:${index}:${run.term}`;
		if (!options.hints)
			return (
				<span key={key} {...langAttrs(options.terms)}>
					{word}
				</span>
			);
		return (
			<button
				key={key}
				type="button"
				{...langAttrs(options.terms)}
				aria-expanded={openHint === hintKey}
				onClick={() => onHint(hintKey)}
				className="cursor-pointer underline decoration-ink-faint decoration-dotted decoration-[0.08em] underline-offset-[0.2em] hover:decoration-ink-soft aria-expanded:decoration-solid"
			>
				{word}
			</button>
		);
	});
}

/** A term's definition, under the line it was tapped in. */
function Hint({
	term,
	options,
}: {
	readonly term: TermId;
	readonly options: ProseOptions;
}) {
	const { en, de, hint } = terms[term];
	const [shown, other] = options.terms === "de" ? [de, en] : [en, de];
	return (
		<span
			role="note"
			className="my-0.5 block rounded-md bg-canvas px-2 py-1 text-xs leading-relaxed text-ink-soft"
		>
			<b {...langAttrs(options.terms)} className="font-semibold text-ink">
				{shown}
			</b>{" "}
			<span className="text-ink-muted">
				(
				<span {...langAttrs(options.terms === "de" ? "en" : "de")}>
					{other}
				</span>
				)
			</span>
			: {hint}
		</span>
	);
}

/** A lemma in a line: italic, as a dictionary cites one, and a link. */
function LemmaLink({
	id,
	text,
	onClick,
}: {
	readonly id: LemmaId;
	readonly text?: string;
	readonly onClick: () => void;
}) {
	const entry = lemmas[id];
	return (
		<button
			type="button"
			{...langAttrs("de")}
			data-dp-lemma={id}
			onClick={onClick}
			className={cn(
				"cursor-pointer text-link italic decoration-current/40 underline-offset-[0.18em] hover:underline focus-visible:underline focus-visible:outline-none",
				entry.tone === "neuter" && "[--link:var(--gender-neuter)]",
			)}
		>
			{text ?? <Headword title={entry.title} slots={entry.slots} />}
		</button>
	);
}

/** A headword with its valency slots set as tf-demo's Valency Line sets them. */
export function Headword({
	title,
	slots = [],
}: {
	readonly title: string;
	readonly slots?: readonly string[];
}): ReactNode {
	return title.split(" ").map((word, index) => (
		<Fragment key={`${index}:${word}`}>
			{index > 0 ? " " : null}
			{slots.includes(word) ? <Slot token={word} /> : word}
		</Fragment>
	));
}

/** A valency slot: `jM`, someone or something in the dative. */
function Slot({ token }: { readonly token: string }) {
	return (
		<span className="font-mono text-[0.9em] text-ink-soft not-italic">
			{token}
		</span>
	);
}

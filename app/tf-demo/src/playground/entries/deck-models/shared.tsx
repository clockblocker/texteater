import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	cleanWord,
	type DummyNote,
	type NoteLink,
	TEXT_SENTENCES,
} from "./dummy";

/* ------------------------------------------------------------------ log */

export type LogEntry = { readonly id: number; readonly text: string };

export function useEventLog() {
	const [entries, setEntries] = useState<readonly LogEntry[]>([]);
	const next = useRef(1);
	const log = useCallback((text: string) => {
		const id = next.current++;
		setEntries((current) => [...current.slice(-39), { id, text }]);
	}, []);
	const clear = useCallback(() => setEntries([]), []);
	return { entries, log, clear } as const;
}

/* ---------------------------------------------------------------- shell */

/**
 * One prototype: a Pane-shaped stage on the left, its rules and a live event
 * log on the right. Every model renders into the same frame so they compare.
 */
export function ModelShell({
	rules,
	entries,
	onReset,
	toolbar,
	children,
}: {
	rules: readonly { readonly move: string; readonly means: string }[];
	entries: readonly LogEntry[];
	onReset: () => void;
	/** Controls shown above the rules, e.g. a model's own switches. */
	toolbar?: ReactNode;
	children: ReactNode;
}) {
	const [rulesOpen, setRulesOpen] = useState(false);
	const logEnd = useRef<HTMLLIElement>(null);
	useEffect(() => {
		logEnd.current?.scrollIntoView({ block: "nearest" });
	}, [entries]);
	return (
		<div className="flex h-full min-h-0 gap-4 overflow-hidden p-4">
			<div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[0.7rem] border border-line bg-canvas">
				{children}
			</div>
			<aside className="flex min-h-0 w-72 shrink-0 flex-col gap-4 overflow-hidden">
				{toolbar ? (
					<section className="shrink-0 rounded-[0.7rem] border border-line bg-paper px-3 py-2">
						{toolbar}
					</section>
				) : null}
				{/* Folded by default: the rules are a reminder, not the work,
				    and folded away the column always fits the viewport. A
				    `details` cannot do this — Chrome wraps its content in a block
				    `::details-content`, which never shrinks as a flex item, so an
				    open rules list would spill past the aside instead of scrolling. */}
				<section
					className={`flex min-h-0 flex-col rounded-[0.7rem] border border-line bg-paper ${rulesOpen ? "flex-1 basis-0" : "shrink-0"}`}
				>
					<button
						type="button"
						aria-expanded={rulesOpen}
						onClick={() => setRulesOpen((open) => !open)}
						className="flex shrink-0 cursor-pointer items-center gap-1.5 p-3 text-left font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase hover:text-ink"
					>
						<span
							aria-hidden="true"
							className={`text-[0.7rem] leading-none transition-transform ${rulesOpen ? "rotate-90" : ""}`}
						>
							›
						</span>
						Closing rules
					</button>
					{rulesOpen ? (
						<dl className="grid min-h-0 grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 overflow-auto px-3 pb-3 text-[0.8rem]">
							{rules.map((rule) => (
								<div key={rule.move} className="contents">
									<dt className="font-medium text-ink">
										{rule.move}
									</dt>
									<dd className="text-ink-soft">
										{rule.means}
									</dd>
								</div>
							))}
						</dl>
					) : null}
				</section>
				<section className="flex min-h-0 flex-1 basis-0 flex-col rounded-[0.7rem] border border-line bg-paper p-3">
					<div className="mb-2 flex items-baseline justify-between">
						<h3 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
							What happened
						</h3>
						<button
							type="button"
							onClick={onReset}
							className="text-[0.72rem] text-ink-soft underline-offset-2 hover:text-ink hover:underline"
						>
							Reset
						</button>
					</div>
					<ol className="min-h-0 flex-1 space-y-1 overflow-auto font-mono text-[0.7rem] leading-snug text-ink-soft">
						{entries.length === 0 ? (
							<li className="text-ink-muted">
								Select a word in the Text to deal a deck.
							</li>
						) : null}
						{entries.map((entry) => (
							<li key={entry.id}>{entry.text}</li>
						))}
						<li ref={logEnd} aria-hidden="true" />
					</ol>
				</section>
			</aside>
		</div>
	);
}

/* --------------------------------------------------------------- reader */

export type WordRef = { readonly word: string; readonly element: HTMLElement };

/**
 * A dummy Text. The selected word wears the selection wash; every other word
 * is an unknown Unit and only its underline reacts.
 */
export function DummyReader({
	selected,
	onSelect,
	onBackground,
	dense = false,
}: {
	selected: string | null;
	onSelect: (ref: WordRef) => void;
	onBackground?: () => void;
	dense?: boolean;
}) {
	return (
		<div
			className={`mx-auto w-full max-w-[42rem] px-8 ${dense ? "pt-6" : "pt-10"} pb-12 font-serif text-[1.15rem] leading-[1.71rem] text-ink`}
			onPointerDown={(event) => {
				if (
					onBackground &&
					!(event.target as HTMLElement).closest("[data-word]")
				)
					onBackground();
			}}
		>
			<h2 className="mb-5 font-sans text-[0.68rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
				Das Haus am Ende
			</h2>
			{TEXT_SENTENCES.map((sentence) => (
				<p key={sentence.join(" ")} className="mb-[1.75rem]">
					{sentence.map((word, index) => (
						<span key={`${word}-${index.toString()}`}>
							<button
								type="button"
								data-word={word}
								aria-pressed={selected === word}
								onClick={(event) =>
									onSelect({
										word,
										element: event.currentTarget,
									})
								}
								className="rounded-[0.2rem] px-[0.08em] text-word-unknown decoration-word-resolving decoration-[1.5px] underline-offset-[0.2em] hover:underline aria-pressed:bg-selection aria-pressed:text-selection-foreground"
							>
								{word}
							</button>
							{index < sentence.length - 1 ? " " : ""}
						</span>
					))}
				</p>
			))}
		</div>
	);
}

/* ----------------------------------------------------------------- note */

const KIND_TINT: Readonly<Record<DummyNote["kind"], string>> = {
	Attestation: "text-ink-muted",
	Reading: "text-link",
	Lemma: "text-ink",
	Surface: "text-ink-soft",
};

export function NoteBody({
	note,
	onFollow,
	compact = false,
}: {
	note: DummyNote;
	onFollow: (link: NoteLink) => void;
	compact?: boolean;
}) {
	return (
		<div
			className={`flex flex-col gap-3 ${compact ? "px-4 py-3" : "px-6 py-5"}`}
		>
			<div>
				<div
					className={`font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase ${KIND_TINT[note.kind]}`}
				>
					{note.kind}
				</div>
				<h3
					className={`font-serif ${compact ? "text-[1.15rem]" : "text-[1.5rem]"} leading-tight text-ink`}
				>
					{note.title}
				</h3>
			</div>
			<div className="space-y-1.5 text-[0.85rem] leading-relaxed text-ink-soft">
				{note.lines.map((line, index) => (
					<p key={`${index.toString()}-${line}`}>{line}</p>
				))}
			</div>
			<ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem]">
				{note.links.map((link) => (
					<li key={link.label}>
						<button
							type="button"
							onClick={(event) => {
								event.stopPropagation();
								onFollow(link);
							}}
							className="text-link decoration-link-shadow decoration-[1.5px] underline-offset-[0.2em] hover:underline"
						>
							{link.kind === "Text"
								? `↩ ${link.label} (${cleanWord(link.word)})`
								: link.label}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

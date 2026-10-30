import { cn } from "lego";
import { langAttrs } from "@/fixtures";
import { toneClass } from "./alignment";
import { columnKey } from "./focus";
import type { GlossCase, SentenceWord } from "./model";

/**
 * The sentence the Attestation stands in, word over plain gloss, then the
 * free translation in single quotes. The clicked words wear the reader's
 * selected underline and take the focus; the words a focused `es` or
 * `damit` stands in for take a quiet wash.
 */
export function SentenceGloss({
	glossCase,
	lit,
	referents,
	onFocus,
}: {
	readonly glossCase: GlossCase;
	/** The clicked words that have the focus. */
	readonly lit: ReadonlySet<string>;
	readonly referents: ReadonlySet<string>;
	/** Focuses a clicked word's column; none when the Card has no columns. */
	readonly onFocus?: (key: string) => void;
}) {
	return (
		<figure
			{...langAttrs("de")}
			className={cn("m-0 grid gap-3", toneClass(glossCase.lemma.tone))}
		>
			<div className="flex flex-wrap items-start gap-x-3.5 gap-y-3 text-sm">
				{glossCase.sentence.map((word) => (
					<SentenceColumn
						key={word.id}
						word={word}
						on={lit.has(word.id)}
						referent={referents.has(word.id)}
						onFocus={onFocus}
					/>
				))}
			</div>
			<figcaption {...langAttrs("en")} className="text-sm text-ink-soft">
				‘{glossCase.sentenceTranslation}’
			</figcaption>
		</figure>
	);
}

function SentenceColumn({
	word,
	on,
	referent,
	onFocus,
}: {
	readonly word: SentenceWord;
	readonly on: boolean;
	readonly referent: boolean;
	readonly onFocus?: (key: string) => void;
}) {
	const rows = (
		<>
			<span className="text-base leading-snug">
				<span
					className={cn(
						word.inUnit &&
							"text-link underline decoration-[0.11em] underline-offset-[0.18em]",
						word.inUnit && !on && "decoration-link/45",
					)}
				>
					{word.word}
				</span>
				{word.after ? (
					<span className="text-ink-soft">{word.after}</span>
				) : null}
			</span>
			<span {...langAttrs("en")} className="text-ink-muted">
				{word.plain}
			</span>
		</>
	);
	const className = cn(
		"grid justify-items-start gap-0.5 rounded-sm text-start",
		referent &&
			"bg-link/12 shadow-[0_0_0_3px_color-mix(in_oklab,var(--link)_12%,transparent)]",
	);
	return word.inUnit && onFocus ? (
		<button
			type="button"
			aria-pressed={on}
			onClick={() => onFocus(columnKey(word.id))}
			className={cn(
				className,
				"cursor-pointer outline-offset-4 focus-visible:outline-2 focus-visible:outline-link",
			)}
		>
			{rows}
		</button>
	) : (
		<div className={className}>{rows}</div>
	);
}

import { cn, DensityScope, Ipa, NoteTitle, NoteTitleLink } from "lego";
import { ArrowUp, Maximize2 } from "lucide-react";
import type { ReactNode } from "react";
import {
	type CardKind,
	cardLang,
	type FakeCard,
	langAttrs,
	type RunLanguage,
} from "@/fixtures";
import type { InflectionTable } from "./inflections";

const surface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/**
 * One full Card, as the fixtures' `CardView` draws it, with room for what a
 * variant adds: `tag` beside the caption, `lemma` where the Card's
 * `lemma →` link goes, `extra` under its text (the inflection table) and
 * `action` in its top inline-end corner (open as Sheet).
 */
export function FullCard({
	card,
	tag,
	lemma,
	extra,
	action,
	className,
}: {
	readonly card: FakeCard;
	readonly tag?: ReactNode;
	readonly lemma?: ReactNode;
	readonly extra?: ReactNode;
	readonly action?: ReactNode;
	readonly className?: string;
}) {
	const lang = cardLang(card);
	return (
		<DensityScope
			density="compact"
			data-card-id={card.id}
			className={cn(
				surface,
				"relative grid gap-3 p-4 text-sm",
				className,
			)}
		>
			{action ? (
				<div className="absolute end-1.5 top-1.5">{action}</div>
			) : null}
			<header className={cn("grid gap-1", action && "pe-6")}>
				<CardKindLabel kind={card.kind} />
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span aria-hidden="true" className="text-xl">
						{card.emoji}
					</span>
					<NoteTitle {...langAttrs(lang)} className="text-lg">
						{card.title}
					</NoteTitle>
					<Ipa
						lang={`${lang}-fonipa`}
						dir="ltr"
						transcription={card.ipa}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
					<p className="text-ink-muted">
						<bdi dir="auto">{card.caption}</bdi>
					</p>
					{tag}
				</div>
			</header>
			<p className="text-ink-soft">
				<span {...langAttrs("en")}>{card.translations.join(", ")}</span>
			</p>
			<p>
				<span {...langAttrs("en")}>{card.definition}</span>
			</p>
			{extra}
			{card.quote ? (
				<blockquote className="border-s-[3px] border-line ps-3 text-ink-soft">
					<span {...langAttrs(lang)}>
						<MarkedQuote
							quote={card.quote}
							marks={card.quoteMarks}
						/>
					</span>
				</blockquote>
			) : null}
			{lemma ? (
				<nav className="flex flex-wrap gap-3 text-ink-muted">
					<span {...langAttrs("en")}>lemma → {lemma}</span>
				</nav>
			) : null}
		</DensityScope>
	);
}

function CardKindLabel({ kind }: { readonly kind: CardKind }) {
	return (
		<span
			{...langAttrs("en")}
			className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase"
		>
			{kind}
		</span>
	);
}

/** The quote with each word in `marks` set in the link colour. */
function MarkedQuote({
	quote,
	marks,
}: {
	readonly quote: string;
	readonly marks: readonly string[];
}) {
	const parts: ReactNode[] = [];
	let cursor = 0;
	for (const match of quote.matchAll(/\p{L}+(?:[-'’]\p{L}+)*/gu)) {
		if (!marks.includes(match[0])) continue;
		parts.push(quote.slice(cursor, match.index));
		parts.push(
			<span key={match.index} className="text-link">
				{match[0]}
			</span>,
		);
		cursor = match.index + match[0].length;
	}
	parts.push(quote.slice(cursor));
	return <>{parts}</>;
}

/**
 * The lemma as a link. `data-lh-link` lets the preview layer find it for
 * ⌘-hover where a variant has previews; a plain click is `onClick`'s.
 */
export function LemmaLink({
	word,
	lang,
	onClick,
}: {
	readonly word: string;
	readonly lang: RunLanguage;
	readonly onClick: () => void;
}) {
	return (
		<NoteTitleLink
			{...langAttrs(lang)}
			data-lh-link={word}
			onClick={onClick}
			className="[-webkit-touch-callout:none] text-link select-none"
		>
			{word}
		</NoteTitleLink>
	);
}

/** Lute v3's parent-term tag on a form: `↑ gehen`. */
export function ParentTag({
	word,
	lang,
	onClick,
}: {
	readonly word: string;
	readonly lang: RunLanguage;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-link/50 bg-link/10 px-2.5 py-0.5 text-sm text-link transition-colors hover:bg-link/20"
		>
			<ArrowUp aria-hidden="true" className="size-3.5" />
			<span {...langAttrs(lang)}>{word}</span>
		</button>
	);
}

/** The front Card's corner button: open it as a Sheet over the reader. */
export function OpenAsSheet({ onClick }: { readonly onClick: () => void }) {
	return (
		<button
			type="button"
			title="Open as Sheet"
			aria-label="Open as Sheet"
			onClick={onClick}
			className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
		>
			<Maximize2
				aria-hidden="true"
				className="size-3.5 rtl:-scale-x-100"
			/>
		</button>
	);
}

/**
 * The lemma's inflections, as LinguaCafe's inflections tab shows them,
 * with the clicked form's cell marked. Content, not navigation: no cell is
 * a button.
 */
export function Inflections({
	table,
	compact = false,
}: {
	readonly table: InflectionTable;
	readonly compact?: boolean;
}) {
	const [markedRow, markedCell] = table.marked;
	return (
		<section className="grid gap-1.5 border-t border-line pt-3">
			<span
				{...langAttrs("en")}
				className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase"
			>
				Inflections
			</span>
			<div className="overflow-x-auto">
				<table
					{...langAttrs(table.lang)}
					className={cn(
						"w-full border-collapse text-start",
						compact ? "text-xs" : "text-sm",
					)}
				>
					<thead>
						<tr>
							{table.columns.map((column, index) => (
								<th
									key={`${index}:${column}`}
									scope="col"
									className="px-1.5 py-1 text-start text-xs font-normal text-ink-faint"
								>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{table.rows.map((row, rowIndex) => (
							<tr
								key={row.label}
								className="border-t border-line"
							>
								<th
									scope="row"
									className="px-1.5 py-1 text-start text-xs font-normal whitespace-nowrap text-ink-muted"
								>
									{row.label}
								</th>
								{row.cells.map((cell, cellIndex) => {
									const marked =
										rowIndex === markedRow &&
										cellIndex === markedCell;
									return (
										<td
											key={`${cellIndex}:${cell}`}
											className="px-0.5 py-0.5 whitespace-nowrap"
										>
											<span
												aria-current={
													marked ? "true" : undefined
												}
												className={cn(
													"rounded-md px-1 py-0.5",
													marked
														? "bg-link/15 font-medium text-link ring-1 ring-link/60"
														: "text-ink-soft",
												)}
											>
												{cell}
											</span>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{table.note ? (
				<p {...langAttrs("en")} className="text-xs text-ink-muted">
					{table.note}
				</p>
			) : null}
		</section>
	);
}

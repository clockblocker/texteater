import { cn, DensityScope, Ipa, NoteTitle, NoteTitleLink } from "lego";
import { ArrowUp, Maximize2 } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import {
	type CardKind,
	cardLang,
	type FakeCard,
	langAttrs,
	type RunLanguage,
} from "@/fixtures";
import {
	type Grid,
	type InflectionTable,
	labelRem,
	mergedGrid,
	type ShownForm,
	tableRem,
} from "./inflections";

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
 * The table's frame width, in rem, at which a grid's table fits; below it
 * the grid reflows into a list. Literal classes, so Tailwind sees them.
 */
const reflowAt: readonly (readonly [number, string, string])[] = [
	[14, "@min-[14rem]/inflections:table", "@min-[14rem]/inflections:hidden"],
	[16, "@min-[16rem]/inflections:table", "@min-[16rem]/inflections:hidden"],
	[18, "@min-[18rem]/inflections:table", "@min-[18rem]/inflections:hidden"],
	[20, "@min-[20rem]/inflections:table", "@min-[20rem]/inflections:hidden"],
	[22, "@min-[22rem]/inflections:table", "@min-[22rem]/inflections:hidden"],
	[24, "@min-[24rem]/inflections:table", "@min-[24rem]/inflections:hidden"],
	[26, "@min-[26rem]/inflections:table", "@min-[26rem]/inflections:hidden"],
	[28, "@min-[28rem]/inflections:table", "@min-[28rem]/inflections:hidden"],
	[30, "@min-[30rem]/inflections:table", "@min-[30rem]/inflections:hidden"],
	[32, "@min-[32rem]/inflections:table", "@min-[32rem]/inflections:hidden"],
	[34, "@min-[34rem]/inflections:table", "@min-[34rem]/inflections:hidden"],
	[36, "@min-[36rem]/inflections:table", "@min-[36rem]/inflections:hidden"],
	[40, "@min-[40rem]/inflections:table", "@min-[40rem]/inflections:hidden"],
	[48, "@min-[48rem]/inflections:table", "@min-[48rem]/inflections:hidden"],
];

const kindLabel =
	"font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase";

/**
 * The lemma's inflections, as LinguaCafe's inflections tab shows them,
 * with every form equal to `marked` marked. A lemma with two sets of forms
 * shows them merged: `melkte · molk older`. Content, not navigation: no
 * form is a button. Where the Card is too narrow for the table, it reflows
 * into a list, column by column, instead of scrolling sideways.
 */
export function Inflections({
	table,
	marked,
	compact = false,
}: {
	readonly table: InflectionTable;
	readonly marked: string;
	readonly compact?: boolean;
}) {
	return (
		<section className="@container/inflections grid gap-1.5 border-t border-line pt-3">
			<span {...langAttrs("en")} className={kindLabel}>
				Inflections
			</span>
			<GridView
				grid={mergedGrid(table, marked)}
				lang={table.lang}
				compact={compact}
			/>
		</section>
	);
}

/**
 * The grid as a table where it fits, as a list where it doesn't, with the
 * label column the same width in both.
 */
function GridView({
	grid,
	lang,
	compact,
}: {
	readonly grid: Grid;
	readonly lang: InflectionTable["lang"];
	readonly compact: boolean;
}) {
	const needed = tableRem(grid, compact);
	const [, showTable, hideList] =
		reflowAt.find(([rem]) => rem >= needed) ?? reflowAt.at(-1) ?? [];
	const text = compact ? "text-xs" : "text-sm";
	const labels = `${labelRem(grid)}rem`;
	const label = "px-1.5 py-1 text-start text-xs font-normal text-ink-muted";
	const lines = grid.lines.map((line) => (
		<tr key={line.label} className="border-t border-line">
			<th scope="row" className={label}>
				{line.label}
			</th>
			<td colSpan={grid.columns.length - 1} className="px-0.5 py-0.5">
				<Forms cell={line.cell} />
			</td>
		</tr>
	));
	return (
		<div className="grid gap-1">
			<table
				{...langAttrs(lang)}
				className={cn(
					"hidden w-full table-fixed border-collapse text-start",
					text,
					showTable,
				)}
			>
				<colgroup>
					<col style={{ width: labels }} />
				</colgroup>
				<thead>
					<tr>
						{grid.columns.map((column, index) => (
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
					{grid.rows.map((row) => (
						<tr key={row.label} className="border-t border-line">
							<th scope="row" className={label}>
								{row.label}
							</th>
							{row.cells.map((cell, index) => (
								<td
									key={`${index}:${row.label}`}
									className="px-0.5 py-0.5"
								>
									<Forms cell={cell} />
								</td>
							))}
						</tr>
					))}
					{lines}
				</tbody>
			</table>
			<div
				{...langAttrs(lang)}
				className={cn("grid gap-2", text, hideList)}
			>
				{grid.columns.slice(1).map((column, index) => (
					<ListBlock
						key={`${index}:${column}`}
						heading={column}
						labels={labels}
						rows={grid.rows.map((row) => ({
							label: row.label,
							cell: row.cells[index] ?? [],
						}))}
					/>
				))}
				{grid.lines.length > 0 ? (
					<ListBlock labels={labels} rows={grid.lines} />
				) : null}
			</div>
		</div>
	);
}

/** One column of a reflowed grid: its heading, then `label → forms`. */
function ListBlock({
	heading,
	labels,
	rows,
}: {
	readonly heading?: string;
	readonly labels: string;
	readonly rows: readonly {
		readonly label: string;
		readonly cell: readonly ShownForm[];
	}[];
}) {
	return (
		<div className="grid gap-0.5">
			{heading ? (
				<span className="px-1.5 text-xs text-ink-faint">{heading}</span>
			) : null}
			<dl
				className="grid items-baseline border-t border-line pt-0.5"
				style={{ gridTemplateColumns: `${labels} 1fr` }}
			>
				{rows.map((row) => (
					<Fragment key={row.label}>
						<dt className="px-1.5 py-0.5 text-xs text-ink-muted">
							{row.label}
						</dt>
						<dd className="px-0.5 py-0.5">
							<Forms cell={row.cell} />
						</dd>
					</Fragment>
				))}
			</dl>
		</div>
	);
}

/** A cell's forms, usual first: `melkte · molk older`. */
function Forms({ cell }: { readonly cell: readonly ShownForm[] }) {
	return cell.map((shown, index) => (
		<Fragment key={shown.form}>
			{index > 0 ? <span className="text-ink-faint"> · </span> : null}
			<span className="whitespace-nowrap">
				<FormText shown={shown} />
				{shown.rarity ? (
					<span
						{...langAttrs("en")}
						className="ms-1 text-[0.65rem] text-ink-faint italic"
					>
						{shown.rarity}
					</span>
				) : null}
			</span>
		</Fragment>
	));
}

/**
 * One form, set off in the link colour where it is the clicked one. Every
 * form keeps the mark's padding, so marked and unmarked forms line up.
 */
function FormText({ shown }: { readonly shown: ShownForm }) {
	return (
		<span
			aria-current={shown.marked ? "true" : undefined}
			className={cn(
				"rounded-md px-1 py-0.5",
				shown.marked
					? "bg-link/15 font-medium text-link ring-1 ring-link/60"
					: "text-ink-soft",
			)}
		>
			{shown.form}
		</span>
	);
}

import {
	cn,
	DensityScope,
	Ipa,
	NoteTags,
	NoteTitle,
	NoteTitleLink,
} from "lego";
import { ArrowUp, Maximize2 } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import {
	type CardKind,
	cardLang,
	type FakeCard,
	type FixtureLanguage,
	langAttrs,
	type RunLanguage,
} from "@/fixtures";
import {
	type Grid,
	gridOf,
	type InflectionTable,
	type ShownCell,
	type ShownForm,
	tableRem,
} from "./inflections";
import { youglishHref, youglishLabel } from "./youglish";

const surface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/**
 * One full Card, as the fixtures' `CardView` draws it, with room for what a
 * variant adds: `tag` beside the caption, `lemma` where the Card's
 * `lemma →` link goes and `action` in its top inline-end corner (open as Sheet).
 */
export function FullCard({
	card,
	tag,
	lemma,
	action,
	className,
}: {
	readonly card: FakeCard;
	readonly tag?: ReactNode;
	readonly lemma?: ReactNode;
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
 * The Lemma and Reading Cards where the lemma has a table: the header
 * (emoji, headword, IPA linked to YouGlish), the Card's own content, the
 * quote, and tf-demo's quiet tag row closing it. The tails above already
 * say what kind of Card it is, so it needs no label; order, size and
 * spacing set its tiers, not rules.
 */
function QuietCard({
	card,
	textLang,
	tags,
	action,
	children,
}: {
	readonly card: FakeCard;
	/** The language of the text the click came from, for YouGlish. */
	readonly textLang: FixtureLanguage;
	readonly tags: readonly string[];
	readonly action?: ReactNode;
	readonly children: ReactNode;
}) {
	const lang = cardLang(card);
	return (
		<DensityScope
			density="compact"
			data-card-id={card.id}
			className={cn(surface, "relative grid gap-4 p-4 text-sm")}
		>
			{action ? (
				<div className="absolute end-1.5 top-1.5">{action}</div>
			) : null}
			<header
				className={cn(
					"flex flex-wrap items-baseline gap-x-3 gap-y-1",
					action && "pe-6",
				)}
			>
				<span aria-hidden="true" className="text-xl">
					{card.emoji}
				</span>
				<NoteTitle {...langAttrs(lang)} className="text-lg">
					{card.title}
				</NoteTitle>
				<Pronunciation
					lemma={card.title}
					ipa={card.ipa}
					lang={lang}
					textLang={textLang}
				/>
			</header>
			{children}
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
			<LemmaTags tags={tags} />
		</DensityScope>
	);
}

/** The Lemma Card with its inflections; translations stay on the Reading. */
export function LemmaCard({
	table,
	marked,
	...card
}: Omit<Parameters<typeof QuietCard>[0], "tags" | "children"> & {
	readonly table: InflectionTable;
	readonly marked: string;
}) {
	return (
		<QuietCard {...card} tags={table.tags}>
			<Inflections table={table} marked={marked} />
		</QuietCard>
	);
}

/**
 * The Reading Card: its gloss and definition under the same header. The
 * fixtures keep a Reading's gloss only in its caption (`das Komma · a
 * comma`); the caption itself stays on the tail.
 */
export function ReadingCard({
	table,
	...props
}: Omit<Parameters<typeof QuietCard>[0], "tags" | "children"> & {
	readonly table: InflectionTable;
}) {
	const gloss = props.card.caption.split(" · ").slice(1).join(" · ");
	return (
		<QuietCard {...props} tags={table.tags}>
			<div className="grid gap-1.5">
				{gloss ? (
					<p className="text-ink-soft">
						<span {...langAttrs("en")}>{gloss}</span>
					</p>
				) : null}
				<p>
					<span {...langAttrs("en")}>{props.card.definition}</span>
				</p>
			</div>
		</QuietCard>
	);
}

/**
 * The IPA as a link to the lemma on YouGlish, in a new tab. Quiet as the
 * IPA alone until hovered or focused, when it takes an underline.
 */
export function Pronunciation({
	lemma,
	ipa,
	lang,
	textLang,
}: {
	readonly lemma: string;
	readonly ipa: string;
	/** The headword's language, for the IPA's `lang`. */
	readonly lang: RunLanguage;
	readonly textLang: FixtureLanguage;
}) {
	const label = youglishLabel(lemma, textLang);
	return (
		<a
			href={youglishHref(lemma, textLang)}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={label}
			title={label}
			className="rounded-sm text-ink-muted decoration-current/50 underline-offset-[0.18em] hover:text-ink-soft hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
		>
			<Ipa lang={`${lang}-fonipa`} dir="ltr" transcription={ipa} />
		</a>
	);
}

/**
 * tf-demo's tag row closing a Note (`NoteTags`), here the lemma's word
 * class and gender. The Card's gap already spaces it, so it drops the
 * row's own top margin.
 */
export function LemmaTags({ tags }: { readonly tags: readonly string[] }) {
	return (
		<NoteTags {...langAttrs("en")} className="mt-0 compact:mt-0">
			{tags.map((tag) => (
				<span key={tag}>{tag}</span>
			))}
		</NoteTags>
	);
}

/**
 * The container width, in rem, from which a grid's table fits; below it
 * the grid reflows into a list. Literal classes, so Tailwind sees them.
 */
const reflowAt: readonly (readonly [number, string, string])[] = [
	[14, "@min-[14rem]/inflections:table", "@min-[14rem]/inflections:hidden"],
	[15, "@min-[15rem]/inflections:table", "@min-[15rem]/inflections:hidden"],
	[16, "@min-[16rem]/inflections:table", "@min-[16rem]/inflections:hidden"],
	[17, "@min-[17rem]/inflections:table", "@min-[17rem]/inflections:hidden"],
	[18, "@min-[18rem]/inflections:table", "@min-[18rem]/inflections:hidden"],
	[19, "@min-[19rem]/inflections:table", "@min-[19rem]/inflections:hidden"],
	[20, "@min-[20rem]/inflections:table", "@min-[20rem]/inflections:hidden"],
	[21, "@min-[21rem]/inflections:table", "@min-[21rem]/inflections:hidden"],
	[22, "@min-[22rem]/inflections:table", "@min-[22rem]/inflections:hidden"],
	[23, "@min-[23rem]/inflections:table", "@min-[23rem]/inflections:hidden"],
	[24, "@min-[24rem]/inflections:table", "@min-[24rem]/inflections:hidden"],
	[25, "@min-[25rem]/inflections:table", "@min-[25rem]/inflections:hidden"],
	[26, "@min-[26rem]/inflections:table", "@min-[26rem]/inflections:hidden"],
	[27, "@min-[27rem]/inflections:table", "@min-[27rem]/inflections:hidden"],
	[28, "@min-[28rem]/inflections:table", "@min-[28rem]/inflections:hidden"],
	[29, "@min-[29rem]/inflections:table", "@min-[29rem]/inflections:hidden"],
	[30, "@min-[30rem]/inflections:table", "@min-[30rem]/inflections:hidden"],
	[31, "@min-[31rem]/inflections:table", "@min-[31rem]/inflections:hidden"],
	[32, "@min-[32rem]/inflections:table", "@min-[32rem]/inflections:hidden"],
	[36, "@min-[36rem]/inflections:table", "@min-[36rem]/inflections:hidden"],
	[40, "@min-[40rem]/inflections:table", "@min-[40rem]/inflections:hidden"],
	[48, "@min-[48rem]/inflections:table", "@min-[48rem]/inflections:hidden"],
];

const small = "text-xs font-normal text-ink-muted";

/**
 * The lemma's inflections, as LinguaCafe's inflections tab shows them,
 * with every form equal to `marked` marked as the reader marks the
 * clicked word. Content, not navigation: no form is a button. No rules:
 * a muted header row and the rows' spacing carry the grid. Where the
 * container is too narrow for the table, it reflows into a list, column
 * by column, instead of scrolling sideways.
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
	const grid = gridOf(table, marked);
	const [, showTable, hideList] =
		reflowAt.find(([rem]) => rem >= tableRem(grid, compact)) ??
		reflowAt.at(-1) ??
		[];
	const text = compact ? "text-xs" : "text-sm";
	const cellClass = "pe-4 py-1 align-baseline last:pe-0";
	return (
		<div {...langAttrs(table.lang)} className="@container/inflections">
			<table
				className={cn(
					"hidden border-collapse text-start tabular-nums",
					text,
					showTable,
				)}
			>
				<thead>
					<tr>
						<td className={cellClass} />
						{grid.columns.map((column, index) => (
							<th
								key={`${index}:${column.heading}`}
								scope="col"
								className={cn(
									small,
									cellClass,
									"pt-0 pb-1.5 text-start",
								)}
							>
								<Heading column={column} />
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{grid.rows.map((row) => (
						<tr key={row.label}>
							<th
								scope="row"
								className={cn(
									small,
									cellClass,
									"text-start whitespace-nowrap",
								)}
							>
								{row.label}
							</th>
							{row.cells.map((cell, index) => (
								<td
									key={`${index}:${row.label}`}
									className={cn(
										cellClass,
										grid.columns[index]?.tag &&
											"text-ink-soft",
									)}
								>
									<CellView cell={cell} />
								</td>
							))}
						</tr>
					))}
					{grid.footers.map((footer) => (
						<tr key={footer.label}>
							<th
								scope="row"
								className={cn(
									small,
									cellClass,
									"pt-3 text-start whitespace-nowrap",
								)}
							>
								{footer.label}
							</th>
							<td
								colSpan={grid.columns.length}
								className={cn(cellClass, "pt-3")}
							>
								<FooterForms footer={footer} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<div className={cn("grid gap-3", text, hideList)}>
				{grid.columns.map((column, index) => (
					<div
						key={`${index}:${column.heading}`}
						className="grid gap-1"
					>
						<span className={small}>
							<Heading column={column} />
						</span>
						<dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
							{grid.rows.map((row) => (
								<Fragment key={row.label}>
									<dt className={small}>{row.label}</dt>
									<dd
										className={cn(
											column.tag && "text-ink-soft",
										)}
									>
										{row.cells[index] ? (
											<CellView cell={row.cells[index]} />
										) : null}
									</dd>
								</Fragment>
							))}
						</dl>
					</div>
				))}
				{grid.footers.length > 0 ? (
					<dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
						{grid.footers.map((footer) => (
							<Fragment key={footer.label}>
								<dt className={small}>{footer.label}</dt>
								<dd>
									<FooterForms footer={footer} />
								</dd>
							</Fragment>
						))}
					</dl>
				) : null}
			</div>
		</div>
	);
}

/** A column's heading, with the rarer series' tag once: `older`. */
function Heading({ column }: { readonly column: Grid["columns"][number] }) {
	return (
		<>
			{column.heading}
			{column.heading && column.tag ? " · " : null}
			{column.tag ? (
				<span {...langAttrs("en")} className="text-ink-faint italic">
					{column.tag}
				</span>
			) : null}
		</>
	);
}

/** A cell's usual form, and a rarer one as a quiet line under it. */
function CellView({ cell }: { readonly cell: ShownCell }) {
	return (
		<>
			<FormText shown={cell.usual} />
			{cell.other ? (
				<span className="block text-xs text-ink-muted">
					<FormText shown={cell.other} />
					<Tag rarity={cell.other.rarity} />
				</span>
			) : null}
		</>
	);
}

/** `hat gemolken · gemelkt also`, the auxiliary dim. */
function FooterForms({ footer }: { readonly footer: Grid["footers"][number] }) {
	return (
		<>
			{footer.aux ? (
				<span className="text-ink-faint">{footer.aux} </span>
			) : null}
			{footer.forms.map((shown, index) => (
				<Fragment key={shown.form}>
					{index > 0 ? (
						<span className="text-ink-faint"> · </span>
					) : null}
					<FormText shown={shown} />
					<Tag rarity={shown.rarity} />
				</Fragment>
			))}
		</>
	);
}

function Tag({ rarity }: { readonly rarity?: string }) {
	return rarity ? (
		<span
			{...langAttrs("en")}
			className="ms-1 text-xs text-ink-faint italic"
		>
			{rarity}
		</span>
	) : null;
}

/**
 * One form, its article dim. The clicked one wears the reader's selected
 * word: the link colour and a solid underline, no box, so its baseline
 * stays put.
 */
function FormText({ shown }: { readonly shown: ShownForm }) {
	return (
		<span className="whitespace-nowrap">
			{shown.article ? (
				<span className="text-ink-faint">{shown.article} </span>
			) : null}
			<span
				aria-current={shown.marked ? "true" : undefined}
				className={cn(
					shown.marked &&
						"text-link underline decoration-[0.11em] underline-offset-[0.18em]",
				)}
			>
				{shown.form}
			</span>
		</span>
	);
}

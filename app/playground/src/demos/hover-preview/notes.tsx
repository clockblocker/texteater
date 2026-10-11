import { cn, DensityScope, Ipa, NoteTitle } from "lego";
import type { ReactNode } from "react";
import { cardLang, type FakeCard, langAttrs } from "@/fixtures";
import { resolveEntry } from "./entries";
import { LinkedWords, TitleLink } from "./linked-text";

/**
 * What a Card, a Sheet and a preview show. Every word of a definition or
 * quote is a link, and so is a lemma; none of them handles a click
 * itself (see `linked-text.tsx`).
 */

const cardSurface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/**
 * One full Card, as `CardView` shows it, with linked words. `action` sits
 * in its top inline-end corner: the Deck puts "open as Sheet" there.
 */
export function LinkedCard({
	card,
	scope,
	action,
	className,
}: {
	readonly card: FakeCard;
	/** Keeps word ids unique across every Card on screen. */
	readonly scope: string;
	readonly action?: ReactNode;
	readonly className?: string;
}) {
	const id = `${scope}~${card.id}`;
	const lang = cardLang(card);
	return (
		<DensityScope
			density="compact"
			data-card-id={card.id}
			className={cn(
				cardSurface,
				"relative grid gap-3 p-4 text-sm",
				className,
			)}
		>
			{action ? (
				<div className="absolute end-1.5 top-1.5">{action}</div>
			) : null}
			<header className="grid gap-1 pe-6">
				<span
					{...langAttrs("en")}
					className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase"
				>
					{card.kind}
				</span>
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
				<p className="text-ink-muted">
					<bdi dir="auto">{card.caption}</bdi>
				</p>
			</header>
			<p className="text-ink-soft">
				<span {...langAttrs("en")}>{card.translations.join(", ")}</span>
			</p>
			{card.definition ? (
				<p className="text-start">
					<LinkedWords id={`${id}~def`} text={card.definition} />
				</p>
			) : null}
			{card.quote ? (
				<blockquote className="border-s-[3px] border-line ps-3 text-start text-ink-soft">
					<LinkedWords
						id={`${id}~quote`}
						text={card.quote}
						lang={lang}
						marks={card.quoteMarks}
					/>
				</blockquote>
			) : null}
			{card.links.length > 0 ? (
				<nav className="flex flex-wrap gap-3 text-ink-muted">
					{card.links.map((link) => (
						<span
							key={`${link.relation}:${link.word}`}
							{...langAttrs("en")}
						>
							{link.relation} →{" "}
							<TitleLink word={link.word} lang={lang} />
						</span>
					))}
				</nav>
			) : null}
		</DensityScope>
	);
}

/**
 * A preview's note under its head (which the preview draws, as its drag
 * handle): the entry a link leads to, small. A form that isn't its own
 * lemma links to the lemma, as the Surface Card does; then the Reading's
 * glosses and its definition.
 */
export function PreviewBody({
	word,
	scope,
}: {
	readonly word: string;
	readonly scope: string;
}) {
	const { cards } = resolveEntry(word);
	const reading = cards.find((card) => card.kind === "Reading");
	const surface = cards.find((card) => card.kind === "Surface");
	if (!reading) return null;
	const lang = cardLang(reading);
	const lemmaLink = surface?.links.find(
		(link) => link.word.toLowerCase() !== word.toLowerCase(),
	);
	return (
		<div className="grid gap-2 text-sm">
			{lemmaLink && surface ? (
				<p className="text-ink-muted">
					{/* One isolate, so the mixed line keeps its order in RTL. */}
					<bdi dir="auto">
						<span {...langAttrs(lang)}>{surface.title}</span>{" "}
						<span {...langAttrs("en")}>
							{surface.caption.split(" · ")[1] ?? "form of"}
						</span>{" "}
						<TitleLink word={lemmaLink.word} lang={lang} />
					</bdi>
				</p>
			) : null}
			<p className="text-ink-soft">
				<span {...langAttrs("en")}>
					{reading.translations.join(", ")}
				</span>
			</p>
			<p className="text-start">
				<LinkedWords id={`${scope}~def`} text={reading.definition} />
			</p>
		</div>
	);
}

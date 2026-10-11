import {
	cn,
	DensityScope,
	Ipa,
	NoteBone,
	NoteLinesSkeleton,
	NoteTitle,
	NoteTitleLink,
} from "lego";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { CardKind, FakeCard, FakeCardLink } from "./resolution";

const surface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/**
 * One Card. Full, it shows the kind, title, IPA, translations, definition,
 * the sentence quote with the clicked words marked, and lemma links.
 * `collapsed` shrinks it to its one-line tail: emoji and caption.
 */
export function CardView({
	card,
	collapsed = false,
	onTailClick,
	onLinkClick,
	className,
}: {
	readonly card: FakeCard;
	readonly collapsed?: boolean;
	/** Makes a collapsed Card a button. */
	readonly onTailClick?: () => void;
	readonly onLinkClick?: (link: FakeCardLink) => void;
	readonly className?: string;
}) {
	if (collapsed) {
		const tail = (
			<>
				<span aria-hidden="true">{card.emoji}</span>
				<span className="truncate">{card.caption}</span>
			</>
		);
		const tailClass = cn(
			surface,
			"flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-ink-soft",
			className,
		);
		return onTailClick ? (
			<button
				type="button"
				data-card-id={card.id}
				onClick={onTailClick}
				className={cn(tailClass, "cursor-pointer hover:text-ink")}
			>
				{tail}
			</button>
		) : (
			<div data-card-id={card.id} className={tailClass}>
				{tail}
			</div>
		);
	}

	return (
		<DensityScope
			density="compact"
			data-card-id={card.id}
			className={cn(surface, "grid gap-3 p-4 text-sm", className)}
		>
			<header className="grid gap-1">
				<CardKindLabel kind={card.kind} />
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span aria-hidden="true" className="text-xl">
						{card.emoji}
					</span>
					<NoteTitle className="text-lg">{card.title}</NoteTitle>
					<Ipa transcription={card.ipa} />
				</div>
				<p className="text-ink-muted">{card.caption}</p>
			</header>
			<p className="text-ink-soft">{card.translations.join(", ")}</p>
			<p>{card.definition}</p>
			{card.quote ? (
				<blockquote className="border-s-[3px] border-line ps-3 text-ink-soft">
					<MarkedQuote quote={card.quote} marks={card.quoteMarks} />
				</blockquote>
			) : null}
			{card.links.length > 0 ? (
				<nav className="flex flex-wrap gap-3 text-ink-muted">
					{card.links.map((link) => (
						<span key={`${link.relation}:${link.word}`}>
							{link.relation} →{" "}
							<NoteTitleLink
								className="text-link"
								onClick={() => onLinkClick?.(link)}
							>
								{link.word}
							</NoteTitleLink>
						</span>
					))}
				</nav>
			) : null}
		</DensityScope>
	);
}

function CardKindLabel({ kind }: { readonly kind: CardKind }) {
	return (
		<span className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase">
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

/** A Card that has not arrived yet: its kind is known, its words are not. */
export function CardSkeleton({
	kind,
	collapsed = false,
	className,
}: {
	readonly kind: CardKind;
	readonly collapsed?: boolean;
	readonly className?: string;
}) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label={`Loading ${kind}`}
			className={cn(
				surface,
				collapsed
					? "flex items-center gap-2 px-3 py-2.5"
					: "grid gap-3 p-4",
				className,
			)}
		>
			{collapsed ? (
				<NoteBone className="w-40" />
			) : (
				<>
					<CardKindLabel kind={kind} />
					<NoteBone tone="headword" className="h-[0.9em] w-28" />
					<NoteLinesSkeleton widths={["w-1/2", "w-full", "w-4/5"]} />
				</>
			)}
		</div>
	);
}

/**
 * Cards as tf-demo's Deck piles them: the front Card in full, the Cards
 * behind it collapsed to their tails above it, each a little narrower the
 * further back it sits. Cards after `frontIndex` are not shown. Clicking a
 * tail calls `onFront` with its index; the stack holds no state.
 */
export function CardStack({
	cards,
	frontIndex = cards.length - 1,
	onFront,
	onLinkClick,
	className,
}: {
	readonly cards: readonly FakeCard[];
	readonly frontIndex?: number;
	readonly onFront?: (index: number) => void;
	readonly onLinkClick?: (link: FakeCardLink) => void;
	readonly className?: string;
}) {
	const shown = cards.slice(0, frontIndex + 1);
	return (
		<div className={cn("flex flex-col", className)}>
			<AnimatePresence initial={false}>
				{shown.map((card, index) => {
					const depth = shown.length - 1 - index;
					return (
						<motion.div
							key={card.id}
							layout
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{
								type: "spring",
								duration: 0.35,
								bounce: 0,
							}}
							style={{
								marginInline: `${Math.min(depth, 4) * 0.5}rem`,
								zIndex: index,
							}}
							className={cn("relative", depth > 0 && "-mb-1.5")}
						>
							<CardView
								card={card}
								collapsed={depth > 0}
								onTailClick={
									onFront ? () => onFront(index) : undefined
								}
								onLinkClick={onLinkClick}
								className={depth > 0 ? "pb-3" : undefined}
							/>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}

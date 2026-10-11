import { cn } from "lego";
import { type ReactNode, type Ref, useEffect, useState } from "react";
import {
	CardSkeleton,
	CardStack,
	type FakeCardLink,
	germanText,
	hebrewText,
	useFakeResolution,
	type WordClick,
	WordText,
} from "@/fixtures";
import type { StackEntry } from "./stack";

/**
 * One lookup's Cards as tf-demo deals them. A new lookup deals its Cards
 * in one by one; once dealt, or when restored from the URL, they are all
 * there at once.
 */
export function LookupCards({
	entry,
	dealing,
	onDealt,
	onLinkClick,
}: {
	readonly entry: StackEntry;
	readonly dealing: boolean;
	readonly onDealt: () => void;
	readonly onLinkClick: (link: FakeCardLink) => void;
}) {
	const dealt = useFakeResolution(dealing ? entry.target : null);
	const [front, setFront] = useState<number | null>(null);
	useEffect(() => {
		if (dealing && dealt.done) onDealt();
	}, [dealing, dealt.done, onDealt]);
	const cards = dealing ? dealt.cards : entry.cards;

	return (
		<div className="grid gap-2">
			<CardStack
				cards={cards}
				frontIndex={Math.min(front ?? cards.length, cards.length - 1)}
				onFront={setFront}
				onLinkClick={onLinkClick}
			/>
			{dealing
				? dealt.pending.map((kind) => (
						<CardSkeleton key={kind} kind={kind} collapsed />
					))
				: null}
		</div>
	);
}

/** A lookup's one-line header: emoji, what was looked up, its gist. */
export function EntryLine({
	entry,
	className,
}: {
	readonly entry: StackEntry;
	readonly className?: string;
}) {
	return (
		<span className={cn("flex min-w-0 items-baseline gap-2", className)}>
			<span aria-hidden="true">{entry.emoji}</span>
			<span dir="auto" className="shrink-0 font-medium text-ink">
				{entry.title}
			</span>
			<span dir="auto" className="truncate text-ink-muted">
				{entry.gist}
			</span>
		</span>
	);
}

/** The reading text: the German story, then the Hebrew sentence. */
export function ReaderText({
	selectedWordId,
	onWordClick,
	className,
}: {
	readonly selectedWordId: string | null;
	readonly onWordClick: (click: WordClick) => void;
	readonly className?: string;
}) {
	return (
		<div className={cn("grid content-start gap-5", className)}>
			<h2 className="text-sm font-semibold text-ink-muted">
				{germanText.title}
			</h2>
			<WordText
				text={germanText}
				selectedWordId={selectedWordId}
				onWordClick={onWordClick}
			/>
			<WordText
				text={hebrewText}
				selectedWordId={selectedWordId}
				onWordClick={onWordClick}
			/>
		</div>
	);
}

/** The newest clicked word in the stack, to underline in the text. */
export function newestWordId(entries: readonly StackEntry[]): string | null {
	for (let index = entries.length - 1; index >= 0; index--) {
		const entry = entries[index];
		if (entry && typeof entry.target !== "string") return entry.key;
	}
	return null;
}

export function IconButton({
	ref,
	label,
	expanded,
	onClick,
	children,
	className,
}: {
	readonly ref?: Ref<HTMLButtonElement>;
	readonly label: string;
	/** For a button that opens a menu. */
	readonly expanded?: boolean;
	readonly onClick: () => void;
	readonly children: ReactNode;
	readonly className?: string;
}) {
	return (
		<button
			ref={ref}
			type="button"
			aria-label={label}
			aria-expanded={expanded}
			title={label}
			onClick={onClick}
			className={cn(
				"grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-ink-muted hover:bg-canvas hover:text-ink",
				className,
			)}
		>
			{children}
		</button>
	);
}

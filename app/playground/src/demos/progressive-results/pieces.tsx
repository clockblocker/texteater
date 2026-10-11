import {
	Button,
	cn,
	DensityScope,
	Ipa,
	NoteBone,
	NoteLinesSkeleton,
	NoteTitle,
} from "lego";
import { RotateCw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { CardKind, FakeCard } from "@/fixtures";

/** The fixtures' Card surface, so local Cards sit flush with `CardView`. */
export const surface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/** The Card padding and spacing `CardView` uses when full. */
export const fullCard = "grid gap-3 p-4 text-sm";

/** A collapsed tail's box, as `CardView` draws it behind the front Card. */
const tailBox =
	"flex w-full items-center gap-2 px-3 pt-1.5 pb-3 text-start text-sm text-ink-soft";

export function KindLabel({ kind }: { readonly kind: CardKind }) {
	return (
		<span className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase">
			{kind}
		</span>
	);
}

/** A tail whose stage has not settled: the same height as a real tail. */
export function SkeletonTail({ kind }: { readonly kind: CardKind }) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label={`Loading ${kind}`}
			className={cn(surface, tailBox)}
		>
			<span className="flex h-5 w-full items-center gap-2">
				<NoteBone className="w-4" />
				<NoteBone className="w-36" />
			</span>
		</div>
	);
}

/** A full Card skeleton: only the kind is known. */
export function SkeletonCard({ kind }: { readonly kind: CardKind }) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label={`Loading ${kind}`}
			className={cn(surface, fullCard)}
		>
			<KindLabel kind={kind} />
			<NoteBone tone="headword" className="h-[0.9em] w-28" />
			<NoteLinesSkeleton widths={["w-1/2", "w-full", "w-4/5"]} />
		</div>
	);
}

/**
 * A Card whose heading has arrived and whose body has not: the heading is
 * laid out as `CardView` lays it out, so it stays put when the body lands.
 */
export function PartialCard({ card }: { readonly card: FakeCard }) {
	return (
		<DensityScope
			density="compact"
			data-card-id={card.id}
			aria-busy="true"
			className={cn(surface, fullCard)}
		>
			<header className="grid gap-1">
				<KindLabel kind={card.kind} />
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span aria-hidden="true" className="text-xl">
						{card.emoji}
					</span>
					<NoteTitle className="text-lg">{card.title}</NoteTitle>
					<Ipa transcription={card.ipa} />
				</div>
				<p className="text-ink-muted">{card.caption}</p>
			</header>
			<NoteLinesSkeleton widths={["w-2/5", "w-full", "w-3/4"]} />
		</DensityScope>
	);
}

export function RetryButton({
	kind,
	onRetry,
}: {
	readonly kind: CardKind;
	readonly onRetry: () => void;
}) {
	return (
		<Button
			variant="outline"
			size="xs"
			onClick={onRetry}
			aria-label={`Retry ${kind}`}
		>
			<RotateCw aria-hidden="true" />
			Retry
		</Button>
	);
}

export function FailedCard({
	kind,
	onRetry,
}: {
	readonly kind: CardKind;
	readonly onRetry: () => void;
}) {
	return (
		<div role="alert" className={cn(surface, fullCard)}>
			<KindLabel kind={kind} />
			<p className="flex items-center gap-2 text-ink">
				<TriangleAlert
					aria-hidden="true"
					className="size-4 shrink-0 text-ink-muted"
				/>
				The {kind} stage failed. The other Cards are unaffected.
			</p>
			<div>
				<RetryButton kind={kind} onRetry={onRetry} />
			</div>
		</div>
	);
}

/** A failed stage behind the front Card: one line, with its own retry. */
export function FailedTail({
	kind,
	onFront,
	onRetry,
}: {
	readonly kind: CardKind;
	readonly onFront?: () => void;
	readonly onRetry: () => void;
}) {
	return (
		<div
			role="alert"
			className={cn(surface, tailBox, "py-0 pt-0.5 pb-2 pe-1.5")}
		>
			<button
				type="button"
				onClick={onFront}
				className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-start hover:text-ink"
			>
				<TriangleAlert
					aria-hidden="true"
					className="size-4 shrink-0 text-ink-muted"
				/>
				<span className="truncate">{kind} failed</span>
			</button>
			<RetryButton kind={kind} onRetry={onRetry} />
		</div>
	);
}

/** A labelled section of the single growing Card (strategy c). */
export function Section({
	kind,
	children,
}: {
	readonly kind: CardKind;
	readonly children: ReactNode;
}) {
	return (
		<section className="grid gap-1 border-line border-t pt-3">
			<KindLabel kind={kind} />
			{children}
		</section>
	);
}

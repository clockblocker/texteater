import { cn } from "lego";
import { ArrowLeft } from "lucide-react";
import {
	type CardKind,
	CardSkeleton,
	CardStack,
	type FakeCard,
	type FakeCardLink,
} from "@/fixtures";

/**
 * Everything the lookup shows, held by the demo rather than by either
 * container, so a switch between dock and sheet keeps the front Card, the
 * Cards already dealt and any lemma hop.
 */
export type LookupState = {
	/** The clicked word as it stands in the text. */
	readonly clicked: string;
	/** A lemma looked up from a Card's link, if any. */
	readonly hop: string | null;
	readonly cards: readonly FakeCard[];
	readonly pending: readonly CardKind[];
	readonly frontIndex: number;
	readonly onFront: (index: number) => void;
	readonly onLinkClick: (link: FakeCardLink) => void;
	readonly onBack: () => void;
};

/**
 * The lookup's content: the one component both containers render, as
 * Readest renders the same results in its side panel and its sheet.
 * `outlined` draws a dashed box and a tag around it, so the hand-off is
 * visibly the same thing in a different container.
 */
export function Lookup({
	state,
	container,
	outlined,
}: {
	readonly state: LookupState;
	readonly container: "dock" | "sheet";
	readonly outlined: boolean;
}) {
	const dealing = state.pending.length > 0;
	return (
		<div
			className={cn(
				"relative grid content-start gap-3 rounded-xl",
				outlined &&
					"outline-1 outline-offset-[6px] outline-link/55 outline-dashed",
			)}
		>
			{outlined ? (
				<span className="absolute -top-[1.05rem] start-2 rounded bg-canvas px-1.5 font-mono text-[0.65rem] text-link">
					<bdi>&lt;Lookup /&gt;</bdi> in the {container}
				</span>
			) : null}
			<div className="flex min-h-7 flex-wrap items-center gap-x-2 text-sm text-ink-muted">
				{state.hop ? (
					<button
						type="button"
						onClick={state.onBack}
						className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-link hover:bg-raised"
					>
						<ArrowLeft
							aria-hidden="true"
							className="size-3.5 rtl:-scale-x-100"
						/>
						{state.clicked}
					</button>
				) : null}
				<span>
					{state.hop ? "lemma " : "clicked "}
					<b className="font-semibold text-ink">
						{state.hop ?? state.clicked}
					</b>
				</span>
				<span className="ms-auto font-mono text-xs text-ink-faint">
					{dealing
						? `dealing ${state.cards.length}/${state.cards.length + state.pending.length}`
						: `${state.cards.length} Cards`}
				</span>
			</div>
			<CardStack
				cards={state.cards}
				frontIndex={state.frontIndex}
				onFront={state.onFront}
				onLinkClick={state.onLinkClick}
			/>
			{state.pending.map((kind) => (
				<CardSkeleton key={kind} kind={kind} collapsed />
			))}
		</div>
	);
}

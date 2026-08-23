import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import type {
	CardDemoFakeSegment,
	CardDemoVariant,
} from "./card-demo-contract";
import {
	CARD_DEMO_FAKE_TEXT,
	CARD_DEMO_RESOLUTION_CHAIN,
} from "./card-demo-fixtures";
import type {
	CardDemoInteraction,
	CardDemoInteractionProps,
} from "./card-demo-interaction";
import { CardDemoPageFrame } from "./card-demo-presentation";
import {
	CARD_DEMO_MOTION,
	type CardDemoRouteTransitionJob,
} from "./card-demo-route-transition";
import { CardDemoTextPane } from "./card-demo-text-pane";
import "./card-demo.css";

export type CardDemoTextInteractionProps = {
	readonly Interaction: CardDemoInteraction;
	readonly selectedSegment: CardDemoFakeSegment | null;
	readonly onSelectedSegmentChange: (
		segment: CardDemoFakeSegment | null,
	) => void;
	readonly onOpenNote: CardDemoInteractionProps["onOpenNote"];
};

/**
 * The reusable Card-demo interaction: selectable fake Segments own the full
 * layered Resolution Card interaction. A caller decides what opening a Card
 * means (route navigation in the Card demo, Sheet Opening in the workspace).
 */
export function CardDemoTextInteraction({
	Interaction,
	selectedSegment,
	onSelectedSegmentChange,
	onOpenNote,
}: CardDemoTextInteractionProps) {
	const segmentButtons = useRef(new Map<string, HTMLButtonElement>());
	const dismissTimerRef = useRef<number | null>(null);
	const [dismissing, setDismissing] = useState(false);
	const cancelDismiss = useCallback(() => {
		if (dismissTimerRef.current !== null) {
			window.clearTimeout(dismissTimerRef.current);
			dismissTimerRef.current = null;
		}
		setDismissing(false);
	}, []);
	useEffect(() => cancelDismiss, [cancelDismiss]);
	const dismiss = useCallback(() => {
		if (dismissing) return;
		const segmentId = selectedSegment?.id;
		setDismissing(true);
		const duration =
			CARD_DEMO_MOTION.dismiss + CARD_DEMO_MOTION.dismissStagger * 3;
		dismissTimerRef.current = window.setTimeout(() => {
			dismissTimerRef.current = null;
			onSelectedSegmentChange(null);
			setDismissing(false);
			if (segmentId) {
				requestAnimationFrame(() =>
					segmentButtons.current.get(segmentId)?.focus(),
				);
			}
		}, duration);
	}, [dismissing, onSelectedSegmentChange, selectedSegment]);
	const selectSegment = (segment: CardDemoFakeSegment) => {
		cancelDismiss();
		onSelectedSegmentChange(segment);
	};

	return (
		<div className="card-demo-text-interaction">
			<div className="card-demo-copy">
				{CARD_DEMO_FAKE_TEXT.paragraphs.map(
					(paragraph, paragraphIndex) => (
						<p
							className="card-demo-segments"
							key={`paragraph-${paragraphIndex}`}
						>
							{paragraph.map((segment) => (
								<button
									className="card-demo-segment"
									data-card-demo-segment={segment.id}
									key={segment.id}
									onClick={() => selectSegment(segment)}
									ref={(node) => {
										if (node)
											segmentButtons.current.set(
												segment.id,
												node,
											);
										else
											segmentButtons.current.delete(
												segment.id,
											);
									}}
									type="button"
								>
									{segment.text}
								</button>
							))}
						</p>
					),
				)}
			</div>
			{selectedSegment ? (
				<CardDemoOverlay
					dismissing={dismissing}
					onDismiss={dismiss}
					selectedSegment={selectedSegment}
				>
					<Interaction
						cards={CARD_DEMO_RESOLUTION_CHAIN}
						onOpenNote={onOpenNote}
						selectedSegment={selectedSegment}
					/>
				</CardDemoOverlay>
			) : null}
		</div>
	);
}

export function CardDemoTextPage({
	Interaction,
	variant,
	selectedSegment,
	onSelectedSegmentChange,
	onOpenNote,
	routeTransition = null,
}: CardDemoTextInteractionProps & {
	readonly variant: CardDemoVariant;
	readonly routeTransition?: CardDemoRouteTransitionJob | null;
}) {
	return (
		<CardDemoPageFrame
			className="card-demo-page--text"
			routeTransition={routeTransition?.direction ?? null}
			transitionKind={routeTransition?.card.kind ?? null}
			variant={variant}
		>
			<CardDemoTextPane>
				<CardDemoTextInteraction
					Interaction={Interaction}
					onOpenNote={onOpenNote}
					onSelectedSegmentChange={onSelectedSegmentChange}
					selectedSegment={selectedSegment}
				/>
			</CardDemoTextPane>
		</CardDemoPageFrame>
	);
}

export function CardDemoOverlay({
	children,
	selectedSegment,
	onDismiss,
	dismissing = false,
}: {
	readonly children: ReactNode;
	readonly selectedSegment: CardDemoFakeSegment;
	readonly onDismiss: () => void;
	readonly dismissing?: boolean;
}) {
	const dialogRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const focusableCards = () =>
			Array.from(
				dialogRef.current?.querySelectorAll<HTMLButtonElement>(
					'[data-card-demo-card]:not([disabled]):not([tabindex="-1"])',
				) ?? [],
			);
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onDismiss();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		focusableCards()[0]?.focus();
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onDismiss]);

	return (
		<div
			className="card-demo-overlay"
			data-card-demo-dismissing={dismissing ? "true" : undefined}
			data-card-demo-overlay=""
		>
			<button
				aria-label="Dismiss card view"
				className="card-demo-backdrop"
				onClick={onDismiss}
				tabIndex={-1}
				type="button"
			/>
			<div
				aria-label={`Resolution Chain for ${selectedSegment.text}`}
				className="card-demo-dialog"
				ref={dialogRef}
				role="dialog"
			>
				<button
					aria-label="Close card view"
					className="card-demo-close"
					onClick={onDismiss}
					type="button"
				>
					Close
				</button>
				{children}
			</div>
		</div>
	);
}

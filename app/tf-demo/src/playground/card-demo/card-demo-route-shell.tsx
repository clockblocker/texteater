import {
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type {
	CardDemoFakeSegment,
	CardDemoNoteKind,
	CardDemoVariant,
} from "./card-demo-contract";
import { CARD_DEMO_VARIANTS } from "./card-demo-contract";
import {
	CARD_DEMO_FAKE_TEXT,
	CARD_DEMO_RESOLUTION_CHAIN,
	cardDemoFakeSegmentById,
} from "./card-demo-fixtures";
import type {
	CardDemoInteraction,
	CardDemoInteractionProps,
	CardDemoOpenOrigin,
} from "./card-demo-interaction";
import {
	CARD_DEMO_BASE_PATH,
	cardDemoHref,
	cardDemoNoteNavigation,
	cardDemoSelectedSegmentIdFromState,
	cardDemoTargetFromLocation,
} from "./card-demo-navigation";
import {
	CardDemoCardContent,
	CardDemoPageFrame,
} from "./card-demo-presentation";
import {
	CARD_DEMO_MOTION,
	CardDemoRouteTransition,
	type CardDemoRouteTransitionJob,
	cardDemoBoxFromElement,
	cardDemoFullPageBox,
} from "./card-demo-route-transition";
import { CardDemoTextPane } from "./card-demo-text-pane";
import { CARD_DEMO_INTERACTIONS } from "./variants/card-demo-interaction-registry";
import "./card-demo.css";

export function CardDemoRouteShell() {
	const location = useLocation();
	const navigate = useNavigate();
	const [selectedSegment, setSelectedSegment] =
		useState<CardDemoFakeSegment | null>(null);
	const [routeTransition, setRouteTransition] =
		useState<CardDemoRouteTransitionJob | null>(null);
	const transitionIdRef = useRef(0);
	const textScrollRef = useRef({ pane: 0, windowX: 0, windowY: 0 });
	const restoreTextScroll = useCallback(() => {
		requestAnimationFrame(() => {
			window.scrollTo(
				textScrollRef.current.windowX,
				textScrollRef.current.windowY,
			);
			const pane = document.querySelector<HTMLElement>(
				'[data-testid="card-demo-text-pane"] > div',
			);
			if (pane) pane.scrollTop = textScrollRef.current.pane;
		});
	}, []);
	const completeRouteTransition = useCallback(
		(jobId: number, direction: CardDemoRouteTransitionJob["direction"]) => {
			setRouteTransition((current) =>
				current?.id === jobId ? null : current,
			);
			if (direction === "returning") restoreTextScroll();
		},
		[restoreTextScroll],
	);
	if (location.pathname === CARD_DEMO_BASE_PATH && location.search === "") {
		return <CardDemoIndex />;
	}
	const target = cardDemoTargetFromLocation(location);

	if (!target) return <CardDemoNotFound />;

	if (target.page === "note") {
		const card = CARD_DEMO_RESOLUTION_CHAIN.find(
			(candidate) => candidate.kind === target.noteKind,
		);
		if (!card) return <CardDemoNotFound />;
		const segment =
			cardDemoFakeSegmentById(
				cardDemoSelectedSegmentIdFromState(location.state),
			) ??
			selectedSegment ??
			CARD_DEMO_FAKE_TEXT.segments[0];
		const returnToText = (event: ReactMouseEvent<HTMLAnchorElement>) => {
			event.preventDefault();
			const sourceBox =
				cardDemoBoxFromElement(
					document.querySelector(
						`[data-card-demo-note="${card.kind}"]`,
					),
				) ??
				cardDemoFullPageBox(
					document.documentElement.clientWidth,
					document.documentElement.clientHeight,
				);
			setSelectedSegment(segment);
			transitionIdRef.current += 1;
			setRouteTransition({
				id: transitionIdRef.current,
				direction: "returning",
				card,
				segment,
				origin: "direct",
				sourceBox,
			});
			navigate(cardDemoHref({ page: "text", variant: target.variant }));
		};
		return (
			<>
				<CardDemoPageFrame
					className="card-demo-page--note"
					routeTransition={routeTransition?.direction ?? null}
					variant={target.variant}
				>
					<section
						className="card-demo-note"
						data-card-demo-note={card.kind}
					>
						<CardDemoCardContent card={card} segment={segment} />
						<a
							className="card-demo-link"
							href={cardDemoHref({
								page: "text",
								variant: target.variant,
							})}
							onClick={returnToText}
						>
							Back to fake Text
						</a>
					</section>
				</CardDemoPageFrame>
				{routeTransition ? (
					<CardDemoRouteTransition
						job={routeTransition}
						key={routeTransition.id}
						onComplete={completeRouteTransition}
					/>
				) : null}
			</>
		);
	}

	const Interaction = CARD_DEMO_INTERACTIONS[target.variant];
	const openNote = (
		noteKind: CardDemoNoteKind,
		origin: CardDemoOpenOrigin,
	) => {
		if (!selectedSegment) return;
		const card = CARD_DEMO_RESOLUTION_CHAIN.find(
			(candidate) => candidate.kind === noteKind,
		);
		if (!card) return;
		const sourceElement =
			document.querySelector(
				`[data-card-demo-drag-overlay="${noteKind}"]`,
			) ??
			document.querySelector(
				`[data-card-demo-card="${noteKind}"][data-outside-cancel-zone="true"]`,
			) ??
			document.querySelector(`[data-card-demo-card="${noteKind}"]`);
		const sourceBox = cardDemoBoxFromElement(sourceElement) ?? {
			left: (document.documentElement.clientWidth - 320) / 2,
			top: (document.documentElement.clientHeight - 176) / 2,
			width: 320,
			height: 176,
		};
		textScrollRef.current = {
			pane:
				document.querySelector<HTMLElement>(
					'[data-testid="card-demo-text-pane"] > div',
				)?.scrollTop ?? 0,
			windowX: window.scrollX,
			windowY: window.scrollY,
		};
		transitionIdRef.current += 1;
		setRouteTransition({
			id: transitionIdRef.current,
			direction: "opening",
			card,
			segment: selectedSegment,
			origin,
			sourceBox,
		});
		const destination = cardDemoNoteNavigation(
			target.variant,
			noteKind,
			selectedSegment.id,
		);
		navigate(destination.to, { state: destination.state });
	};
	return (
		<>
			<CardDemoTextPage
				Interaction={Interaction}
				onOpenNote={openNote}
				onSelectedSegmentChange={setSelectedSegment}
				routeTransition={routeTransition}
				selectedSegment={selectedSegment}
				variant={target.variant}
			/>
			{routeTransition ? (
				<CardDemoRouteTransition
					job={routeTransition}
					key={routeTransition.id}
					onComplete={completeRouteTransition}
				/>
			) : null}
		</>
	);
}

const cardDemoVariantLabels = {
	native: "Native",
	motion: "Motion",
	"dnd-kit": "dnd-kit",
	"gesture-spring": "Gesture + Spring",
} as const satisfies Record<CardDemoVariant, string>;

export function CardDemoIndex() {
	return (
		<div className="card-demo-index" data-card-demo-index="">
			<nav aria-label="Card playground versions">
				<ul>
					{CARD_DEMO_VARIANTS.map((variant) => (
						<li key={variant}>
							<Link to={cardDemoHref({ page: "text", variant })}>
								{cardDemoVariantLabels[variant]}
							</Link>
						</li>
					))}
				</ul>
			</nav>
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
}: {
	readonly Interaction: CardDemoInteraction;
	readonly variant: CardDemoVariant;
	readonly selectedSegment: CardDemoFakeSegment | null;
	readonly onSelectedSegmentChange: (
		segment: CardDemoFakeSegment | null,
	) => void;
	readonly onOpenNote: CardDemoInteractionProps["onOpenNote"];
	readonly routeTransition?: CardDemoRouteTransitionJob | null;
}) {
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
		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const duration = reducedMotion
			? CARD_DEMO_MOTION.reduced
			: CARD_DEMO_MOTION.dismiss + CARD_DEMO_MOTION.dismissStagger * 3;
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
		<CardDemoPageFrame
			className="card-demo-page--text"
			routeTransition={routeTransition?.direction ?? null}
			transitionKind={routeTransition?.card.kind ?? null}
			variant={variant}
		>
			<CardDemoTextPane>
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
			</CardDemoTextPane>
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

function CardDemoNotFound() {
	return (
		<div className="card-demo-page">
			<h1>Card playground route not found</h1>
			<p>Use one of the four registered variant Text or Note routes.</p>
			<Link
				className="card-demo-link"
				to={`${CARD_DEMO_BASE_PATH}/native/text`}
			>
				Open the native variant
			</Link>
		</div>
	);
}

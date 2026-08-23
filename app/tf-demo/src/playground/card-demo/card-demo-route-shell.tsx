import {
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import type { CardDemoFakeSegment } from "./card-demo-contract";
import { CARD_DEMO_VARIANT } from "./card-demo-contract";
import {
	CARD_DEMO_FAKE_TEXT,
	CARD_DEMO_RESOLUTION_CHAIN,
	cardDemoFakeSegmentById,
} from "./card-demo-fixtures";
import type { CardDemoOpenRequest } from "./card-demo-interaction";
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
	CardDemoRouteTransition,
	type CardDemoRouteTransitionJob,
	cardDemoBoxFromElement,
	cardDemoFullPageBox,
} from "./card-demo-route-transition";
import { CardDemoTextPage } from "./card-demo-text-interaction";
import { MotionCardDemoInteraction } from "./variants/motion-card-demo-interaction";

export { CardDemoTextPage };

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
		return (
			<Navigate
				replace
				to={cardDemoHref({ page: "text", variant: CARD_DEMO_VARIANT })}
			/>
		);
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

	const openNote = (request: CardDemoOpenRequest): boolean | undefined => {
		if (!selectedSegment) return;
		const card = CARD_DEMO_RESOLUTION_CHAIN.find(
			(candidate) => candidate.kind === request.kind,
		);
		if (!card) return;
		const sourceElement =
			document.querySelector(
				`[data-card-demo-drag-overlay="${request.kind}"]`,
			) ??
			document.querySelector(
				`[data-card-demo-card="${request.kind}"][data-outside-cancel-zone="true"]`,
			) ??
			document.querySelector(`[data-card-demo-card="${request.kind}"]`);
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
			origin: request.origin,
			sourceBox,
		});
		const destination = cardDemoNoteNavigation(
			target.variant,
			request.kind,
			selectedSegment.id,
		);
		navigate(destination.to, { state: destination.state });
		return true;
	};
	return (
		<>
			<CardDemoTextPage
				Interaction={MotionCardDemoInteraction}
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

function CardDemoNotFound() {
	return (
		<div className="card-demo-page">
			<h1>Card playground route not found</h1>
			<p>Use the Motion Text or Note routes.</p>
			<Link
				className="card-demo-link"
				to={`${CARD_DEMO_BASE_PATH}/motion/text`}
			>
				Open the Motion demo
			</Link>
		</div>
	);
}

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type {
	CardDemoFakeSegment,
	CardDemoNoteKind,
	CardDemoVariant,
} from "./card-demo-contract";
import { CARD_DEMO_VARIANTS } from "./card-demo-contract";
import {
	CARD_DEMO_FAKE_SENTENCE,
	CARD_DEMO_RESOLUTION_CHAIN,
	cardDemoFakeSegmentById,
} from "./card-demo-fixtures";
import { nextCardDemoFocusIndex } from "./card-demo-focus";
import type { CardDemoInteraction } from "./card-demo-interaction";
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
import { CARD_DEMO_INTERACTIONS } from "./variants/card-demo-interaction-registry";
import "./card-demo.css";

export function CardDemoRouteShell() {
	const location = useLocation();
	const navigate = useNavigate();
	const [selectedSegment, setSelectedSegment] =
		useState<CardDemoFakeSegment | null>(null);
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
			CARD_DEMO_FAKE_SENTENCE.segments[0];
		return (
			<CardDemoPageFrame variant={target.variant}>
				<section
					className="card-demo-note"
					data-card-demo-note={card.kind}
				>
					<CardDemoCardContent card={card} segment={segment} />
					<Link
						className="card-demo-link"
						onClick={() => setSelectedSegment(null)}
						to={cardDemoHref({
							page: "text",
							variant: target.variant,
						})}
					>
						Back to fake Text
					</Link>
				</section>
			</CardDemoPageFrame>
		);
	}

	const Interaction = CARD_DEMO_INTERACTIONS[target.variant];
	return (
		<CardDemoTextPage
			Interaction={Interaction}
			onOpenNote={(noteKind) => {
				if (!selectedSegment) return;
				const destination = cardDemoNoteNavigation(
					target.variant,
					noteKind,
					selectedSegment.id,
				);
				navigate(destination.to, { state: destination.state });
			}}
			onSelectedSegmentChange={setSelectedSegment}
			selectedSegment={selectedSegment}
			variant={target.variant}
		/>
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
}: {
	readonly Interaction: CardDemoInteraction;
	readonly variant: CardDemoVariant;
	readonly selectedSegment: CardDemoFakeSegment | null;
	readonly onSelectedSegmentChange: (
		segment: CardDemoFakeSegment | null,
	) => void;
	readonly onOpenNote: (kind: CardDemoNoteKind) => void;
}) {
	const segmentButtons = useRef(new Map<string, HTMLButtonElement>());
	const dismiss = () => {
		const segmentId = selectedSegment?.id;
		onSelectedSegmentChange(null);
		if (segmentId) {
			requestAnimationFrame(() =>
				segmentButtons.current.get(segmentId)?.focus(),
			);
		}
	};

	return (
		<CardDemoPageFrame variant={variant}>
			<section
				aria-hidden={selectedSegment ? true : undefined}
				aria-label="Fake Text"
				className="card-demo-text"
				inert={selectedSegment ? true : undefined}
			>
				<p className="card-demo-segments">
					{CARD_DEMO_FAKE_SENTENCE.segments.map((segment) => (
						<button
							className="card-demo-segment"
							data-card-demo-segment={segment.id}
							key={segment.id}
							onClick={() => onSelectedSegmentChange(segment)}
							ref={(node) => {
								if (node)
									segmentButtons.current.set(
										segment.id,
										node,
									);
								else segmentButtons.current.delete(segment.id);
							}}
							type="button"
						>
							{segment.text}
						</button>
					))}
				</p>
			</section>
			{selectedSegment ? (
				<CardDemoOverlay
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
}: {
	readonly children: ReactNode;
	readonly selectedSegment: CardDemoFakeSegment;
	readonly onDismiss: () => void;
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
				return;
			}
			if (event.key !== "Tab") return;
			const cards = focusableCards();
			const currentIndex = cards.indexOf(
				document.activeElement as HTMLButtonElement,
			);
			const nextIndex = nextCardDemoFocusIndex(
				currentIndex,
				cards.length,
				event.shiftKey,
			);
			if (nextIndex === null) return;
			event.preventDefault();
			cards[nextIndex]?.focus();
		};
		window.addEventListener("keydown", onKeyDown);
		focusableCards()[0]?.focus();
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onDismiss]);

	return (
		<div className="card-demo-overlay" data-card-demo-overlay="">
			<button
				aria-label="Dismiss Resolution Chain"
				className="card-demo-backdrop"
				data-card-demo-backdrop=""
				onClick={onDismiss}
				tabIndex={-1}
				type="button"
			/>
			<div
				aria-label={`Resolution Chain for ${selectedSegment.text}`}
				aria-modal="true"
				className="card-demo-dialog"
				ref={dialogRef}
				role="dialog"
			>
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

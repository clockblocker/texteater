import { type CSSProperties, useEffect, useState } from "react";

import type {
	CardDemoFakeSegment,
	CardDemoResolutionCard,
} from "./card-demo-contract";
import type { CardDemoOpenOrigin } from "./card-demo-interaction";
import { CardDemoCardContent } from "./card-demo-presentation";

export const CARD_DEMO_MOTION = {
	dismiss: 220,
	dismissStagger: 18,
	dropSettle: 120,
	prime: 250,
	expand: 350,
	returnPrime: 220,
	returnRest: 180,
	reduced: 100,
} as const;

export type CardDemoTransitionBox = {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

export type CardDemoRouteTransitionJob = {
	readonly id: number;
	readonly direction: "opening" | "returning";
	readonly card: CardDemoResolutionCard;
	readonly segment: CardDemoFakeSegment;
	readonly origin: CardDemoOpenOrigin;
	readonly sourceBox: CardDemoTransitionBox;
};

export function cardDemoPrimedBox(
	viewportWidth: number,
	viewportHeight: number,
): CardDemoTransitionBox {
	const width = Math.min(viewportWidth / 3, Math.max(0, viewportWidth - 32));
	const height = Math.min(
		viewportHeight / 3,
		Math.max(0, viewportHeight - 32),
	);
	return {
		left: (viewportWidth - width) / 2,
		top: (viewportHeight - height) / 2,
		width,
		height,
	};
}

export function cardDemoFullPageBox(
	viewportWidth: number,
	viewportHeight: number,
): CardDemoTransitionBox {
	return { left: 0, top: 0, width: viewportWidth, height: viewportHeight };
}

export function cardDemoBoxFromElement(
	element: Element | null,
): CardDemoTransitionBox | null {
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	return {
		left: rect.left,
		top: rect.top,
		width: rect.width,
		height: rect.height,
	};
}

export function CardDemoRouteTransition({
	job,
	onComplete,
}: {
	readonly job: CardDemoRouteTransitionJob;
	readonly onComplete: (
		jobId: number,
		direction: CardDemoRouteTransitionJob["direction"],
	) => void;
}) {
	const [box, setBox] = useState(job.sourceBox);
	const [duration, setDuration] = useState(0);
	const [phase, setPhase] = useState<
		"source" | "primed" | "full" | "resting" | "reduced"
	>("source");

	useEffect(() => {
		const timers: number[] = [];
		let frame = 0;
		const schedule = (callback: () => void, delay: number) => {
			timers.push(window.setTimeout(callback, delay));
		};
		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const viewportWidth = document.documentElement.clientWidth;
		const viewportHeight = document.documentElement.clientHeight;
		const full =
			cardDemoBoxFromElement(
				document.querySelector(".card-demo-page--note"),
			) ?? cardDemoFullPageBox(viewportWidth, viewportHeight);
		const primed = cardDemoPrimedBox(viewportWidth, viewportHeight);

		if (reducedMotion) {
			setBox(job.direction === "opening" ? full : job.sourceBox);
			setDuration(0);
			setPhase("reduced");
			schedule(
				() => onComplete(job.id, job.direction),
				CARD_DEMO_MOTION.reduced,
			);
			return () => timers.forEach(window.clearTimeout);
		}

		frame = window.requestAnimationFrame(() => {
			if (job.direction === "opening") {
				const primeDuration =
					job.origin === "drop"
						? CARD_DEMO_MOTION.dropSettle
						: CARD_DEMO_MOTION.prime;
				setDuration(primeDuration);
				setPhase("primed");
				setBox(primed);
				schedule(() => {
					setDuration(CARD_DEMO_MOTION.expand);
					setPhase("full");
					setBox(full);
					schedule(
						() => onComplete(job.id, job.direction),
						CARD_DEMO_MOTION.expand,
					);
				}, primeDuration);
				return;
			}

			setDuration(CARD_DEMO_MOTION.returnPrime);
			setPhase("primed");
			setBox(primed);
			schedule(() => {
				const restingCard = document.querySelector(
					`[data-card-demo-card="${job.card.kind}"]`,
				);
				setDuration(CARD_DEMO_MOTION.returnRest);
				setPhase("resting");
				setBox(cardDemoBoxFromElement(restingCard) ?? primed);
				schedule(
					() => onComplete(job.id, job.direction),
					CARD_DEMO_MOTION.returnRest,
				);
			}, CARD_DEMO_MOTION.returnPrime);
		});

		return () => {
			window.cancelAnimationFrame(frame);
			timers.forEach(window.clearTimeout);
		};
	}, [job, onComplete]);

	return (
		<div
			aria-hidden="true"
			className="card-demo-route-transition"
			data-card-demo-route-transition={job.direction}
		>
			<div
				className="card-demo-route-transition__card"
				data-card-demo-transition-phase={phase}
				style={
					{
						left: box.left,
						top: box.top,
						width: box.width,
						height: box.height,
						transitionDuration: `${duration}ms`,
					} as CSSProperties
				}
			>
				<CardDemoCardContent card={job.card} segment={job.segment} />
			</div>
		</div>
	);
}

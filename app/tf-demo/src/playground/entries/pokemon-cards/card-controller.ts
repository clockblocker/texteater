import { cancelFrame, frame } from "motion/react";
import { adjust, clamp, round } from "./math";
import { type Orientation, resetBaseOrientation } from "./orientation";
import { spring } from "./svelte-spring";

/**
 * The `<script>` of upstream's `Card.svelte`: its springs, pointer and
 * device-orientation tilt, the pop-out to the centre and the showcase's
 * intro, with the same numbers and timings. The page it centres a Card on is
 * the entry's frame, `view`, where upstream uses the window. React state
 * stands in for the Svelte `let`s the markup reads.
 */
export type CardHost = {
	readonly card: () => HTMLElement | null;
	/** The scrolling frame that stands in for upstream's window. */
	readonly view: () => HTMLElement | null;
	readonly activeCard: () => HTMLElement | undefined;
	readonly setActiveCard: (card: HTMLElement | undefined) => void;
	readonly setActive: (active: boolean) => void;
	readonly setInteracting: (interacting: boolean) => void;
};

const springInteractSettings = { stiffness: 0.066, damping: 0.25 };
const springPopoverSettings = { stiffness: 0.033, damping: 0.45 };

type Point = { readonly x: number; readonly y: number };
type Glare = Point & { readonly o: number };

export function createCardController(host: CardHost) {
	const springRotate = spring<Point>({ x: 0, y: 0 }, springInteractSettings);
	const springGlare = spring<Glare>(
		{ x: 50, y: 50, o: 0 },
		springInteractSettings,
	);
	const springBackground = spring<Point>(
		{ x: 50, y: 50 },
		springInteractSettings,
	);
	const springRotateDelta = spring<Point>(
		{ x: 0, y: 0 },
		springPopoverSettings,
	);
	const springTranslate = spring<Point>(
		{ x: 0, y: 0 },
		springPopoverSettings,
	);
	const springScale = spring<number>(1, springPopoverSettings);
	const springs = [
		springRotate,
		springGlare,
		springBackground,
		springRotateDelta,
		springTranslate,
		springScale,
	] as const;

	const timers = new Set<ReturnType<typeof setTimeout>>();
	const later = (run: () => void, delay: number) => {
		const timer = setTimeout(() => {
			timers.delete(timer);
			run();
		}, delay);
		timers.add(timer);
		return timer;
	};

	let repositionTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingSpringUpdate: {
		readonly background: Point;
		readonly rotate: Point;
		readonly glare: Glare;
	} | null = null;
	let updateScheduled = false;
	let firstPop = true;
	let isVisible = document.visibilityState === "visible";

	let showcaseInterval: ReturnType<typeof setInterval> | undefined;
	let showcaseTimerStart: ReturnType<typeof setTimeout> | undefined;
	let showcaseTimerEnd: ReturnType<typeof setTimeout> | undefined;
	let showcaseRunning = false;

	const isActive = () => {
		const card = host.card();
		const active = host.activeCard();
		return !!active && active === card;
	};

	/** The `dynamicStyles` upstream binds to the Card's `style`. */
	const writeStyles = () => {
		const card = host.card();
		if (!card) return;
		const glare = springGlare.get();
		const rotate = springRotate.get();
		const rotateDelta = springRotateDelta.get();
		const background = springBackground.get();
		const translate = springTranslate.get();
		const vars: readonly (readonly [string, string])[] = [
			["--pointer-x", `${glare.x}%`],
			["--pointer-y", `${glare.y}%`],
			[
				"--pointer-from-center",
				`${clamp(
					Math.sqrt(
						(glare.y - 50) * (glare.y - 50) +
							(glare.x - 50) * (glare.x - 50),
					) / 50,
					0,
					1,
				)}`,
			],
			["--pointer-from-top", `${glare.y / 100}`],
			["--pointer-from-left", `${glare.x / 100}`],
			["--card-opacity", `${glare.o}`],
			["--rotate-x", `${rotate.x + rotateDelta.x}deg`],
			["--rotate-y", `${rotate.y + rotateDelta.y}deg`],
			["--background-x", `${background.x}%`],
			["--background-y", `${background.y}%`],
			["--card-scale", `${springScale.get()}`],
			["--translate-x", `${translate.x}px`],
			["--translate-y", `${translate.y}px`],
		];
		for (const [name, value] of vars) card.style.setProperty(name, value);
	};
	const scheduleStyles = () => {
		frame.render(writeStyles);
	};
	const unsubscribes = springs.map((each) =>
		(each.subscribe as (run: () => void) => () => void)(scheduleStyles),
	);

	const endShowcase = () => {
		if (showcaseRunning) {
			clearTimeout(showcaseTimerEnd);
			clearTimeout(showcaseTimerStart);
			clearInterval(showcaseInterval);
			showcaseRunning = false;
		}
	};

	const updateSprings = (background: Point, rotate: Point, glare: Glare) => {
		for (const each of [springBackground, springRotate, springGlare]) {
			each.stiffness = springInteractSettings.stiffness;
			each.damping = springInteractSettings.damping;
		}
		springBackground.set(background);
		springRotate.set(rotate);
		springGlare.set(glare);
	};

	const applyPendingUpdate = () => {
		if (pendingSpringUpdate) {
			updateSprings(
				pendingSpringUpdate.background,
				pendingSpringUpdate.rotate,
				pendingSpringUpdate.glare,
			);
			pendingSpringUpdate = null;
		}
		updateScheduled = false;
	};

	const interact = (event: PointerEvent) => {
		endShowcase();

		if (!isVisible) {
			host.setInteracting(false);
			return;
		}

		// prevent other background cards being interacted with
		const active = host.activeCard();
		if (active && active !== host.card()) {
			host.setInteracting(false);
			return;
		}

		host.setInteracting(true);

		const target = event.target as HTMLElement;
		const rect = target.getBoundingClientRect(); // get element's current size/position
		const absolute = {
			x: event.clientX - rect.left, // get mouse position from left
			y: event.clientY - rect.top, // get mouse position from right
		};
		const percent = {
			x: clamp(round((100 / rect.width) * absolute.x)),
			y: clamp(round((100 / rect.height) * absolute.y)),
		};
		const center = {
			x: percent.x - 50,
			y: percent.y - 50,
		};

		// Store the latest interaction data
		pendingSpringUpdate = {
			background: {
				x: adjust(percent.x, 0, 100, 37, 63),
				y: adjust(percent.y, 0, 100, 33, 67),
			},
			rotate: {
				x: round(-(center.x / 3.5)),
				y: round(center.y / 3.5),
			},
			glare: {
				x: round(percent.x),
				y: round(percent.y),
				o: 1,
			},
		};

		// Schedule spring update for next frame if not already scheduled
		if (!updateScheduled) {
			updateScheduled = true;
			frame.update(applyPendingUpdate);
		}
	};

	const interactEnd = (delay = 500) => {
		// Cancel any pending animation frame
		if (updateScheduled) {
			cancelFrame(applyPendingUpdate);
			updateScheduled = false;
		}
		pendingSpringUpdate = null;

		later(() => {
			const snapStiff = 0.01;
			const snapDamp = 0.06;
			host.setInteracting(false);

			springRotate.stiffness = snapStiff;
			springRotate.damping = snapDamp;
			springRotate.set({ x: 0, y: 0 }, { soft: 1 });

			springGlare.stiffness = snapStiff;
			springGlare.damping = snapDamp;
			springGlare.set({ x: 50, y: 50, o: 0 }, { soft: 1 });

			springBackground.stiffness = snapStiff;
			springBackground.damping = snapDamp;
			springBackground.set({ x: 50, y: 50 }, { soft: 1 });
		}, delay);
	};

	/* Upstream also reports the selection to Google Analytics here. */
	const activate = () => {
		if (isActive()) {
			host.setActiveCard(undefined);
		} else {
			host.setActiveCard(host.card() ?? undefined);
			resetBaseOrientation();
		}
	};

	const deactivate = () => {
		interactEnd();
		host.setActiveCard(undefined);
	};

	const setCenter = () => {
		const card = host.card();
		const view = host.view();
		if (!card || !view) return;
		const rect = card.getBoundingClientRect(); // get element's size/position
		const page = view.getBoundingClientRect(); // the frame's size/position

		const delta = {
			x: round(
				page.left +
					view.clientLeft +
					view.clientWidth / 2 -
					rect.x -
					rect.width / 2,
			),
			y: round(
				page.top +
					view.clientTop +
					view.clientHeight / 2 -
					rect.y -
					rect.height / 2,
			),
		};
		springTranslate.set({
			x: delta.x,
			y: delta.y,
		});
	};

	const reposition = () => {
		clearTimeout(repositionTimer);
		repositionTimer = later(() => {
			if (isActive()) {
				setCenter();
			}
		}, 300);
	};

	const popover = () => {
		const card = host.card();
		const view = host.view();
		if (!card || !view) return;
		const rect = card.getBoundingClientRect(); // get element's size/position
		let delay = 100;
		const scaleW = (view.clientWidth / rect.width) * 0.9;
		const scaleH = (view.clientHeight / rect.height) * 0.9;
		const scaleF = 1.75;
		setCenter();
		if (firstPop) {
			delay = 1000;
			springRotateDelta.set({
				x: 360,
				y: 0,
			});
		}
		firstPop = false;
		springScale.set(Math.min(scaleW, scaleH, scaleF));
		interactEnd(delay);
	};

	const retreat = () => {
		springScale.set(1, { soft: true });
		springTranslate.set({ x: 0, y: 0 }, { soft: true });
		springRotateDelta.set({ x: 0, y: 0 }, { soft: true });
		interactEnd(100);
	};

	const reset = () => {
		interactEnd(0);
		springScale.set(1, { hard: true });
		springTranslate.set({ x: 0, y: 0 }, { hard: true });
		springRotateDelta.set({ x: 0, y: 0 }, { hard: true });
		springRotate.set({ x: 0, y: 0 }, { hard: true });
	};

	const orientate = (event: Orientation) => {
		const x = event.relative.gamma;
		const y = event.relative.beta;
		const limit = { x: 16, y: 18 };

		const degrees = {
			x: clamp(x, -limit.x, limit.x),
			y: clamp(y, -limit.y, limit.y),
		};

		updateSprings(
			{
				x: adjust(degrees.x, -limit.x, limit.x, 37, 63),
				y: adjust(degrees.y, -limit.y, limit.y, 33, 67),
			},
			{
				x: round(degrees.x * -1),
				y: round(degrees.y),
			},
			{
				x: adjust(degrees.x, -limit.x, limit.x, 0, 100),
				y: adjust(degrees.y, -limit.y, limit.y, 0, 100),
				o: 1,
			},
		);
	};

	/** Upstream's two `$:` blocks on `$activeCard`, in their order. */
	const activeCardChanged = (orientation: Orientation) => {
		if (isActive()) {
			popover();
			host.setActive(true);
			host.setInteracting(true);
			orientate(orientation);
		} else {
			retreat();
			host.setActive(false);
		}
	};

	/** Upstream's `$:` block on `$orientation`. */
	const orientationChanged = (orientation: Orientation) => {
		if (isActive()) {
			host.setInteracting(true);
			orientate(orientation);
		}
	};

	const visibilityChanged = () => {
		isVisible = document.visibilityState === "visible";
		endShowcase();
		reset();
	};

	/** The `onMount` "cute little animation on load" of the showcase Card. */
	const startShowcase = () => {
		if (!isVisible) return;
		showcaseRunning = true;
		const s = 0.02;
		const d = 0.5;
		let r = 0;
		showcaseTimerStart = setTimeout(() => {
			host.setInteracting(true);
			host.setActive(true);
			for (const each of [springRotate, springGlare, springBackground]) {
				each.stiffness = s;
				each.damping = d;
			}
			if (isVisible) {
				showcaseInterval = setInterval(() => {
					r += 0.05;
					springRotate.set({
						x: Math.sin(r) * 25,
						y: Math.cos(r) * 25,
					});
					springGlare.set({
						x: 55 + Math.sin(r) * 55,
						y: 55 + Math.cos(r) * 55,
						o: 0.8,
					});
					springBackground.set({
						x: 20 + Math.sin(r) * 20,
						y: 20 + Math.cos(r) * 20,
					});
				}, 20);
				showcaseTimerEnd = setTimeout(() => {
					clearInterval(showcaseInterval);
					interactEnd(0);
				}, 4000);
			} else {
				host.setInteracting(false);
				host.setActive(false);
			}
		}, 2000);
	};

	const dispose = () => {
		clearTimeout(showcaseTimerEnd);
		clearTimeout(showcaseTimerStart);
		clearInterval(showcaseInterval);
		clearTimeout(repositionTimer);
		for (const timer of timers) clearTimeout(timer);
		cancelFrame(applyPendingUpdate);
		cancelFrame(writeStyles);
		for (const unsubscribe of unsubscribes) unsubscribe();
		for (const each of springs) each.stop();
	};

	return {
		writeStyles,
		interact,
		interactEnd,
		activate,
		deactivate,
		reposition,
		activeCardChanged,
		orientationChanged,
		visibilityChanged,
		startShowcase,
		dispose,
	};
}

export type CardController = ReturnType<typeof createCardController>;

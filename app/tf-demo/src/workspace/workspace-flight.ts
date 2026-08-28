import type { WorkspaceDragDropEffect } from "./workspace-drag";

/**
 * Where the in-flight drag visual should land when the drag ends. Derived
 * from the same projection that produces the semantic drop effect, so the
 * flight and the state change can never disagree about the outcome.
 */
export type WorkspaceDropFlightPlan =
	| { readonly kind: "ReturnToSource" }
	| { readonly kind: "LandAsSheet"; readonly sheetId: string }
	| { readonly kind: "Dissolve" };

export type WorkspaceDropFlightContext = {
	readonly sourceElement: Element | null;
	readonly overlayElement: Element | null;
};

export type WorkspaceDropFlightHooks = {
	/** Called once the landing is painted, before the overlay is retired. */
	readonly onLanded?: () => void;
};

export const RETURN_TO_SOURCE_PLAN: WorkspaceDropFlightPlan = {
	kind: "ReturnToSource",
};

/** Must stay in step with --workspace-motion-settle/--workspace-motion-ease. */
const FLIGHT_DURATION_MS = 240;
const FLIGHT_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const DISSOLVE_DURATION_MS = 160;
/** Frames to wait for React to mount the landing Sheet before giving up. */
const LANDING_WAIT_FRAMES = 24;
/** Hard ceiling so a hidden tab can never strand an overlay mid-flight. */
const ANIMATION_SETTLE_CEILING_MS = 1000;

export function planWorkspaceDropFlight(
	effect: WorkspaceDragDropEffect,
	placedSheetId: string | null,
): WorkspaceDropFlightPlan {
	switch (effect.kind) {
		case "PlaceCard":
			return placedSheetId
				? { kind: "LandAsSheet", sheetId: placedSheetId }
				: RETURN_TO_SOURCE_PLAN;
		case "MoveSheet":
			return { kind: "LandAsSheet", sheetId: effect.sheetId };
		case "RemoveSheet":
			return { kind: "Dissolve" };
		default:
			return RETURN_TO_SOURCE_PLAN;
	}
}

/**
 * Custom drop animation for the workspace DragOverlay: flies the dragged
 * visual onto the element it becomes (or back into the slot it came from)
 * instead of dnd-kit's default, which can only aim at the source element and
 * therefore aims at a detached rect whenever a drop unmounts that source.
 * Never rejects; always resolves after the landing has been painted.
 */
export async function runWorkspaceDropFlight(
	context: WorkspaceDropFlightContext,
	plan: WorkspaceDropFlightPlan,
	hooks: WorkspaceDropFlightHooks = {},
): Promise<void> {
	const overlay = context.overlayElement;
	const animations: Animation[] = [];
	if (overlay instanceof HTMLElement) {
		try {
			if (plan.kind === "Dissolve") {
				animations.push(...(await animateDissolve(overlay)));
			} else {
				const landing = await resolveLandingElement(context, plan);
				const target = landing?.getBoundingClientRect();
				if (landing && target) {
					animations.push(
						...(await animateLanding(overlay, target, plan)),
					);
				} else {
					animations.push(...(await animateDissolve(overlay)));
				}
			}
		} catch {
			// Flights are cosmetic; a failed animation must not strand the
			// overlay or swallow the landing callback.
		}
	}
	try {
		hooks.onLanded?.();
	} finally {
		await holdPaintedFrame();
		for (const animation of animations) animation.cancel();
	}
}

async function resolveLandingElement(
	context: WorkspaceDropFlightContext,
	plan: WorkspaceDropFlightPlan,
): Promise<Element | null> {
	if (plan.kind === "ReturnToSource") {
		return connected(context.sourceElement);
	}
	if (plan.kind !== "LandAsSheet") return null;
	const selector = `[data-sheet-id="${CSS.escape(plan.sheetId)}"]`;
	let landing = document.querySelector(selector);
	for (let frame = 0; !landing && frame < LANDING_WAIT_FRAMES; frame += 1) {
		await holdPaintedFrame();
		landing = document.querySelector(selector);
	}
	if (landing) return landing;
	// The placement was rejected or unmounted; fall back to the source slot.
	return connected(context.sourceElement);
}

function connected(element: Element | null): Element | null {
	return element?.isConnected ? element : null;
}

/**
 * Animates the overlay box onto the landing rect. Width and height travel
 * through min/max constraints, the technique dnd-kit itself uses, because
 * the overlay's inline width/height stay pinned to the pickup size.
 */
async function animateLanding(
	overlay: HTMLElement,
	target: DOMRect,
	plan: WorkspaceDropFlightPlan,
): Promise<Animation[]> {
	const duration = motionDuration(overlay, FLIGHT_DURATION_MS);
	const current = overlay.getBoundingClientRect();
	const translate = translateOf(overlay);
	const overlayAnimation = overlay.animate(
		[
			{
				translate: `${translate.x}px ${translate.y}px 0`,
				minWidth: `${current.width}px`,
				maxWidth: `${current.width}px`,
				minHeight: `${current.height}px`,
				maxHeight: `${current.height}px`,
			},
			{
				translate: `${translate.x + target.left - current.left}px ${translate.y + target.top - current.top}px 0`,
				minWidth: `${target.width}px`,
				maxWidth: `${target.width}px`,
				minHeight: `${target.height}px`,
				maxHeight: `${target.height}px`,
			},
		],
		{ duration, easing: FLIGHT_EASING, fill: "forwards" },
	);
	const child = overlay.firstElementChild;
	const childAnimation =
		child instanceof HTMLElement
			? animateLandingChild(child, target, plan, duration)
			: null;
	const animations = childAnimation
		? [overlayAnimation, childAnimation]
		: [overlayAnimation];
	await settled(...animations);
	return animations;
}

/**
 * Morphs the rendered Card inside the overlay so it ends up filling the
 * landed overlay exactly, from a pinned Sheet-move Card or a plain Card
 * alike. Insets and translate are only animated when they carry a real
 * value, so static children keep their document flow.
 */
function animateLandingChild(
	child: HTMLElement,
	target: DOMRect,
	plan: WorkspaceDropFlightPlan,
	duration: number,
): Animation {
	const styles = getComputedStyle(child);
	const squareCorners =
		plan.kind === "LandAsSheet" ||
		child.hasAttribute("data-sheet-drag-edge");
	const start: Keyframe = {
		width: styles.width,
		height: styles.height,
	};
	const end: Keyframe = {
		width: `${target.width}px`,
		height: `${target.height}px`,
	};
	if (isAnimatableInset(styles.top)) {
		start.top = styles.top;
		end.top = "0px";
	}
	if (isAnimatableInset(styles.left)) {
		start.left = styles.left;
		end.left = "0px";
	}
	if (styles.translate !== "none") {
		start.translate = styles.translate;
		end.translate = "0px 0px";
	}
	if (squareCorners) {
		start.borderRadius = styles.borderRadius;
		end.borderRadius = "0px";
	}
	return child.animate([start, end], {
		duration,
		easing: FLIGHT_EASING,
		fill: "forwards",
	});
}

async function animateDissolve(overlay: HTMLElement): Promise<Animation[]> {
	const animation = overlay.animate(
		{ opacity: [1, 0], scale: [1, 0.96] },
		{
			duration: motionDuration(overlay, DISSOLVE_DURATION_MS),
			easing: "ease-out",
			fill: "forwards",
		},
	);
	await settled(animation);
	return [animation];
}

function isAnimatableInset(value: string): boolean {
	return /^-?[\d.]+(px|%)$/.test(value);
}

function translateOf(element: Element): { x: number; y: number } {
	const value = getComputedStyle(element).translate;
	if (!value || value === "none") return { x: 0, y: 0 };
	const [x = "0", y = "0"] = value.trim().split(/\s+/);
	return {
		x: Number.parseFloat(x) || 0,
		y: Number.parseFloat(y) || 0,
	};
}

function motionDuration(element: HTMLElement, milliseconds: number): number {
	const view = element.ownerDocument.defaultView;
	return view?.matchMedia("(prefers-reduced-motion: reduce)").matches
		? 0
		: milliseconds;
}

/** Resolves when the animations are finished or hopelessly stalled. */
function settled(...animations: Animation[]): Promise<unknown> {
	return Promise.race([
		Promise.all(animations.map((animation) => animation.finished)),
		new Promise((resolve) =>
			setTimeout(resolve, ANIMATION_SETTLE_CEILING_MS),
		),
	]);
}

/** One frame that also arrives while the document is hidden. */
function holdPaintedFrame(): Promise<void> {
	return new Promise((resolve) => {
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			resolve();
		};
		requestAnimationFrame(finish);
		setTimeout(finish, 32);
	});
}

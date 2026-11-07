import { REDUCED } from "../core/reduce";
import { snapOffset } from "../core/snap";
import { DEPARTURE } from "../core/springs";
import { done, startTerms, sumAt, type Term, valueAt } from "../core/term";
import type { BodyState, Engine } from "./engine";

/**
 * A Part only the old form had, copied before the commit with where it sat:
 * `at` in its Body and `x`, `y` in its face's padding box, in px.
 */
export type Leaving = {
	readonly id: string;
	readonly at: { readonly x: number; readonly y: number };
	readonly copy: HTMLElement;
	readonly face: HTMLElement;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

/** A departed Part's still copy, fading out as it travels. */
export type Ghost = {
	readonly el: HTMLElement;
	fade: Term;
	travel: readonly Term[];
	/** Where its travel starts, which snapping never rounds back past. */
	readonly from: number;
};

/**
 * `leaving` stays in its face as a still copy, rests at `x`, `y` and shows
 * its `travel` Terms across on top, as a Part does, and fades out with the box's
 * first move, clipped by the face as the box shrinks. So a Part only the
 * old form had never vanishes at once. Under reduced motion it fades with
 * the dissolve.
 */
export function haunt(
	engine: Engine,
	body: BodyState,
	leaving: Leaving,
	travel: readonly Term[],
	now: number,
	bornAt: number,
) {
	const { copy, face } = leaving;
	copy.removeAttribute("data-tabletop-part");
	copy.setAttribute("data-tabletop-ghost", "");
	copy.setAttribute("aria-hidden", "true");
	copy.inert = true;
	for (const prop of ["--part-x", "--part-y", "--part-o"])
		copy.style.removeProperty(prop);
	Object.assign(copy.style, {
		position: "absolute",
		inset: "auto",
		left: `${leaving.x}px`,
		top: `${leaving.y}px`,
		width: `${leaving.width}px`,
		height: `${leaving.height}px`,
		margin: "0",
		boxSizing: "border-box",
		pointerEvents: "none",
	});
	face.append(copy);
	const fade = engine.policy.reduced
		? { ms: REDUCED.dissolveMs, ease: DEPARTURE.fade.ease }
		: DEPARTURE.fade;
	body.ghosts.push({
		el: copy,
		travel,
		from: sumAt(travel, "x", now),
		fade: {
			channel: "opacity",
			delta: 1,
			curve: { kind: "tween", ...fade },
			delayMs: 0,
			bornAt,
			source: "app",
		},
	});
}

/** Starts the clock of every ghost the Table held, at `at`. */
export function startGhosts(body: BodyState, at: number) {
	for (const ghost of body.ghosts) {
		ghost.travel = startTerms(ghost.travel, at);
		ghost.fade = startTerms([ghost.fade], at)[0] ?? ghost.fade;
	}
}

/**
 * Writes each ghost's travel, snapped as a Part's is, and its fade at
 * `now`, and drops the ones the fade ended; whether any is left.
 */
export function writeGhosts(
	body: BodyState,
	now: number,
	dpr: number,
): boolean {
	body.ghosts = body.ghosts.filter((ghost) => {
		if (done(ghost.fade, now)) {
			ghost.el.remove();
			return false;
		}
		const x = snapOffset(sumAt(ghost.travel, "x", now), ghost.from, dpr);
		ghost.el.style.translate = `${x}px`;
		ghost.el.style.opacity = valueAt(ghost.fade, now).toFixed(3);
		return true;
	});
	return body.ghosts.length > 0;
}

export function clearGhosts(body: BodyState) {
	for (const ghost of body.ghosts) ghost.el.remove();
	body.ghosts = [];
}

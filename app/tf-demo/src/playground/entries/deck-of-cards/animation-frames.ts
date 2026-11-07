type Animation = {
	readonly start: number;
	readonly end: number;
	started?: boolean;
	startcb?: () => void;
	progresscb?: (t: number) => void;
	endcb?: () => void;
};

/** One scheduled tween; each callback setter keeps only the last one. */
export type AnimationFrame = {
	readonly start: (cb: () => void) => AnimationFrame;
	readonly progress: (cb: (t: number) => void) => AnimationFrame;
	readonly end: (cb: () => void) => AnimationFrame;
};

// One ticker for every animation of every Deck, on `Date.now()`.
let ticking = false;
const animations: Animation[] = [];

/**
 * Schedules a tween that starts `delay` ms from now and lasts `duration` ms.
 * Its progress callback gets the linear time fraction, capped at 1.
 */
export function animationFrames(
	delay: number,
	duration: number,
): AnimationFrame {
	const now = Date.now();

	// calculate animation start/end times
	const start = now + delay;
	const end = start + duration;

	const animation: Animation = { start, end };

	// add animation
	animations.push(animation);

	if (!ticking) {
		// start ticking
		ticking = true;
		requestAnimationFrame(tick);
	}
	const self: AnimationFrame = {
		start: (cb) => {
			// add start callback (just one)
			animation.startcb = cb;
			return self;
		},
		progress: (cb) => {
			// add progress callback (just one)
			animation.progresscb = cb;
			return self;
		},
		end: (cb) => {
			// add end callback (just one)
			animation.endcb = cb;
			return self;
		},
	};
	return self;
}

function tick() {
	const now = Date.now();

	if (!animations.length) {
		// stop ticking
		ticking = false;
		return;
	}

	for (let i = 0; i < animations.length; i++) {
		const animation = animations[i];
		if (animation === undefined) continue;
		if (now < animation.start) {
			// animation not yet started..
			continue;
		}
		if (!animation.started) {
			// animation starts
			animation.started = true;
			animation.startcb?.();
		}
		// animation progress
		const t = (now - animation.start) / (animation.end - animation.start);
		animation.progresscb?.(t < 1 ? t : 1);
		if (now > animation.end) {
			// animation ended
			animation.endcb?.();
			animations.splice(i, 1);
			i--;
		}
	}
	requestAnimationFrame(tick);
}

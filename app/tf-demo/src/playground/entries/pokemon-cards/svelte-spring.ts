import { cancelFrame, frame, frameData } from "motion/react";

/**
 * Svelte 3.59's `spring` from `svelte/motion`, the store every value of
 * upstream's Card moves on, ported line for line and ticked on Motion's frame
 * loop. Its `stiffness` and `damping` are Svelte's per-frame units (0.066 is
 * not Motion's 0.066), and `soft` sets the mass to infinite and lets it
 * recover over `soft` seconds, which Motion's springs have no knob for, so
 * the integrator is Svelte's own: one step per frame, `dt` in 60ths of a
 * second, velocity from the last two values.
 */
export type SpringValue = number | { readonly [key: string]: number };

type SpringSetOptions = {
	readonly hard?: boolean;
	readonly soft?: boolean | number;
};

export type Spring<T extends SpringValue> = {
	readonly set: (value: T, options?: SpringSetOptions) => void;
	readonly get: () => T;
	readonly subscribe: (run: (value: T) => void) => () => void;
	/** Stops ticking, as an unmount does. */
	readonly stop: () => void;
	stiffness: number;
	damping: number;
	precision: number;
};

type Tick = {
	readonly invMass: number;
	readonly opts: {
		readonly stiffness: number;
		readonly damping: number;
		readonly precision: number;
	};
	settled: boolean;
	readonly dt: number;
};

function tickSpring<T extends SpringValue>(
	ctx: Tick,
	lastValue: T,
	currentValue: T,
	targetValue: T,
): T {
	if (
		typeof currentValue === "number" &&
		typeof lastValue === "number" &&
		typeof targetValue === "number"
	) {
		const delta = targetValue - currentValue;
		const velocity = (currentValue - lastValue) / (ctx.dt || 1 / 60); // guard div by 0
		const spring = ctx.opts.stiffness * delta;
		const damper = ctx.opts.damping * velocity;
		const acceleration = (spring - damper) * ctx.invMass;
		const d = (velocity + acceleration) * ctx.dt;
		if (
			Math.abs(d) < ctx.opts.precision &&
			Math.abs(delta) < ctx.opts.precision
		) {
			return targetValue; // settled
		}
		ctx.settled = false; // signal loop to keep ticking
		return (currentValue + d) as T;
	}
	const last = lastValue as { readonly [key: string]: number };
	const target = targetValue as { readonly [key: string]: number };
	const next: { [key: string]: number } = {};
	for (const key in currentValue as { readonly [key: string]: number }) {
		next[key] = tickSpring(
			ctx,
			last[key] ?? 0,
			(currentValue as { readonly [key: string]: number })[key] ?? 0,
			target[key] ?? 0,
		);
	}
	return next as T;
}

export function spring<T extends SpringValue>(
	initial: T,
	opts: {
		readonly stiffness?: number;
		readonly damping?: number;
		readonly precision?: number;
	} = {},
): Spring<T> {
	const subscribers = new Set<(value: T) => void>();
	let value = initial;
	let lastTime = 0;
	let running = false;
	let lastValue = initial;
	let targetValue = initial;
	let invMass = 1;
	let invMassRecoveryRate = 0;
	let cancelTask = false;

	const publish = () => {
		for (const run of subscribers) run(value);
	};

	const loop = () => {
		if (cancelTask) {
			cancelTask = false;
			running = false;
			return;
		}
		const now = frameData.timestamp;
		invMass = Math.min(invMass + invMassRecoveryRate, 1);
		const ctx: Tick = {
			invMass,
			opts: store,
			settled: true,
			dt: ((now - lastTime) * 60) / 1000,
		};
		const nextValue = tickSpring(ctx, lastValue, value, targetValue);
		lastTime = now;
		lastValue = value;
		value = nextValue;
		publish();
		if (ctx.settled) running = false;
		else frame.update(loop);
	};

	const store: Spring<T> = {
		stiffness: opts.stiffness ?? 0.15,
		damping: opts.damping ?? 0.8,
		precision: opts.precision ?? 0.01,
		get: () => value,
		subscribe: (run) => {
			subscribers.add(run);
			run(value);
			return () => {
				subscribers.delete(run);
			};
		},
		set: (newValue, setOptions = {}) => {
			targetValue = newValue;
			if (
				setOptions.hard ||
				(store.stiffness >= 1 && store.damping >= 1)
			) {
				cancelTask = true; // cancel any running animation
				lastTime = performance.now();
				lastValue = newValue;
				value = targetValue;
				publish();
				return;
			}
			if (setOptions.soft) {
				const rate = setOptions.soft === true ? 0.5 : +setOptions.soft;
				invMassRecoveryRate = 1 / (rate * 60);
				invMass = 0; // infinite mass, unaffected by spring forces
			}
			if (!running) {
				lastTime = performance.now();
				cancelTask = false;
				running = true;
				frame.update(loop);
			}
		},
		stop: () => {
			cancelFrame(loop);
			running = false;
			subscribers.clear();
		},
	};
	return store;
}

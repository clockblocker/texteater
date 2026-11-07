/**
 * `src/lib/stores/orientation.js`: the device's tilt, absolute and relative
 * to a base reading. Like Svelte's `readable`, it listens for
 * `deviceorientation` while it has a subscriber and keeps its last value.
 */
type Angles = {
	readonly alpha: number;
	readonly beta: number;
	readonly gamma: number;
};

export type Orientation = {
	readonly absolute: Angles;
	readonly relative: Angles;
};

/* A sensorless device reports null angles, which upstream's arithmetic
   reads as 0. */
const getRawOrientation = (event?: DeviceOrientationEvent): Angles =>
	event
		? {
				alpha: Number(event.alpha),
				beta: Number(event.beta),
				gamma: Number(event.gamma),
			}
		: { alpha: 0, beta: 0, gamma: 0 };

let firstReading = true;
let baseOrientation = getRawOrientation();

const getOrientationObject = (event?: DeviceOrientationEvent): Orientation => {
	const orientation = getRawOrientation(event);
	return {
		absolute: orientation,
		relative: {
			alpha: orientation.alpha - baseOrientation.alpha,
			beta: orientation.beta - baseOrientation.beta,
			gamma: orientation.gamma - baseOrientation.gamma,
		},
	};
};

export const resetBaseOrientation = () => {
	firstReading = true;
	baseOrientation = getRawOrientation();
};

let value = getOrientationObject();
const subscribers = new Set<(value: Orientation) => void>();

// https://developer.mozilla.org/en-US/docs/Web/API/Window/ondeviceorientation
const handleOrientation = (event: DeviceOrientationEvent) => {
	if (firstReading) {
		firstReading = false;
		baseOrientation = getRawOrientation(event);
	}
	value = getOrientationObject(event);
	for (const run of subscribers) run(value);
};

export const orientation = {
	get: () => value,
	subscribe: (run: (value: Orientation) => void) => {
		if (subscribers.size === 0)
			window.addEventListener(
				"deviceorientation",
				handleOrientation,
				true,
			);
		subscribers.add(run);
		run(value);
		return () => {
			subscribers.delete(run);
			if (subscribers.size === 0)
				window.removeEventListener(
					"deviceorientation",
					handleOrientation,
					true,
				);
		};
	},
};

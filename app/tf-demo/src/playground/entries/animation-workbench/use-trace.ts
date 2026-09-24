import { type RefObject, useEffect, useRef } from "react";
import {
	type Frame,
	feed,
	IDLE,
	type Marker,
	type RecorderState,
	type Recording,
} from "./trace";

/**
 * The elements a specimen is watched by, named the way the deck names
 * them. Every one is read each frame: its box, in the deck frame's
 * coordinates, and its own opacity. Names come from the deck's data
 * attributes, so a Note is the same channel in every form it takes.
 */
const PROBES: readonly {
	readonly selector: string;
	readonly name: (element: HTMLElement) => string;
}[] = [
	{
		selector: "[data-deck-pane]",
		name: (element) => `Pane ${element.dataset.deckPane ?? ""}`,
	},
	{
		selector: "[data-pane-bar]",
		name: (element) =>
			`Pane bar ${element.closest<HTMLElement>("[data-deck-pane]")?.dataset.deckPane ?? ""}`,
	},
	{
		selector: "[data-card-id]",
		name: (element) => `Note ${element.dataset.cardId ?? ""}`,
	},
	{
		selector: "[data-heading]",
		name: (element) =>
			`Heading ${element.closest<HTMLElement>("[data-card-id]")?.dataset.cardId ?? ""}`,
	},
	{
		selector: "[data-zone]",
		name: (element) => `Zone ${element.dataset.zone ?? ""}`,
	},
	{
		selector: '[data-block="contexts"] li',
		name: (element) => {
			const list = element.parentElement;
			const nth = list ? Array.from(list.children).indexOf(element) : 0;
			return `Context ${(nth + 1).toString()} of ${element.closest<HTMLElement>("[data-card-id]")?.dataset.cardId ?? ""}`;
		},
	},
];

const PROPERTIES = ["top", "left", "width", "height", "opacity"] as const;

const INPUTS: readonly {
	readonly type: keyof HTMLElementEventMap;
	readonly label: (event: Event) => string;
}[] = [
	{ type: "pointerdown", label: () => "pointer down" },
	{ type: "pointerup", label: () => "pointer up" },
	{ type: "pointercancel", label: () => "pointer cancel" },
	{ type: "click", label: () => "click" },
	{
		type: "keydown",
		label: (event) =>
			`key ${event instanceof KeyboardEvent ? event.key : ""}`,
	},
];

/**
 * Reads every probe once. Boxes are relative to the deck frame, so a
 * value is a position in the specimen, not on the page; a ghost (a drop
 * preview) is its own channel, named as such.
 */
function sample(root: HTMLElement, t: number): Frame {
	const frame = root.querySelector<HTMLElement>("[data-deck-frame]") ?? root;
	const origin = frame.getBoundingClientRect();
	const values: Record<string, number> = {};
	for (const probe of PROBES) {
		const elements = frame.querySelectorAll<HTMLElement>(probe.selector);
		for (const element of elements) {
			const box = element.getBoundingClientRect();
			const ghost = element.dataset.preview !== undefined ? " ghost" : "";
			const name = `${probe.name(element)}${ghost}`;
			const read = {
				top: box.top - origin.top,
				left: box.left - origin.left,
				width: box.width,
				height: box.height,
				opacity: Number(getComputedStyle(element).opacity),
			};
			for (const property of PROPERTIES)
				values[`${name}:${property}`] = read[property];
		}
	}
	return { t, values };
}

/**
 * Watches a specimen for as long as it is mounted: every input on it is
 * a marker, every animation frame a sample, and `onRecording` is called
 * with each recording the recorder closes. Nothing here re-renders per
 * frame; the recorder lives in a ref and only a finished recording
 * reaches React.
 *
 * Reading boxes forces layout once a frame, which Motion's own layout
 * animations do anyway. The sample is taken in the frame after the one
 * Motion wrote, so an absolute time can be a frame late; the differences
 * between channels, which are what the trace is for, are not.
 */
export function useTrace(
	root: RefObject<HTMLElement | null>,
	onRecording: (recording: Recording) => void,
): void {
	const latest = useRef(onRecording);
	latest.current = onRecording;
	useEffect(() => {
		const element = root.current;
		if (!element) return;
		let state: RecorderState = IDLE;
		let pending: Marker[] = [];
		const listeners = INPUTS.map(({ type, label }) => {
			const listener = (event: Event) => {
				pending.push({ t: performance.now(), label: label(event) });
			};
			element.addEventListener(type, listener, { capture: true });
			return () => element.removeEventListener(type, listener, true);
		});
		let handle = 0;
		const tick = (t: number) => {
			handle = requestAnimationFrame(tick);
			const markers = pending;
			pending = [];
			const before = state.done.at(-1);
			state = feed(state, sample(element, t), markers);
			const closed = state.done.at(-1);
			if (closed && closed !== before) latest.current(closed);
		};
		handle = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(handle);
			for (const remove of listeners) remove();
		};
	}, [root]);
}

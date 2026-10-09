import { afterAll, beforeAll } from "bun:test";
import type { RegisteredHandle } from "../../components/handle/types";
import type { RegisteredRegion } from "../../components/region/types";
import type {
	Orientation,
	RegisteredSplit,
} from "../../components/split/types";
import type { HitArea } from "../dom/calculateHitAreas";

/**
 * Stand-ins for the DOM a Split's hit areas are read from. Bun runs tests
 * without one, and hit-area code reads only an element's `nodeType`,
 * attributes, `aria-disabled`, bounding rect and offsets, the Split's
 * computed `direction`, and builds `DOMRect`s.
 */

export type Box = { x: number; y: number; width: number; height: number };

/** A `DOMRect` with the browser's edge semantics, for negative sizes too. */
class StandInDOMRect {
	x: number;
	y: number;
	width: number;
	height: number;

	constructor(x = 0, y = 0, width = 0, height = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}

	get left() {
		return Math.min(this.x, this.x + this.width);
	}

	get right() {
		return Math.max(this.x, this.x + this.width);
	}

	get top() {
		return Math.min(this.y, this.y + this.height);
	}

	get bottom() {
		return Math.max(this.y, this.y + this.height);
	}
}

/** Installs `DOMRect` and `Node` for the calling test file, and removes them after it. */
export function useDomStandIns() {
	const names = ["DOMRect", "Node"] as const;
	const saved = names.map((name) =>
		Object.getOwnPropertyDescriptor(globalThis, name),
	);
	beforeAll(() => {
		Object.defineProperty(globalThis, "DOMRect", {
			configurable: true,
			writable: true,
			value: StandInDOMRect,
		});
		Object.defineProperty(globalThis, "Node", {
			configurable: true,
			writable: true,
			value: { ELEMENT_NODE: 1 },
		});
	});
	afterAll(() => {
		names.forEach((name, index) => {
			const descriptor = saved[index];
			if (descriptor) {
				Object.defineProperty(globalThis, name, descriptor);
			} else {
				Reflect.deleteProperty(globalThis, name);
			}
		});
	});
}

type ChildSpec =
	| { kind: "region"; id: string; box: Box; disabled: boolean }
	| {
			kind: "handle";
			id: string;
			box: Box;
			ariaDisabled: boolean;
			registered: boolean;
	  }
	| { kind: "static"; box: Box }
	| { kind: "text" };

export function region(
	id: string,
	box: Box,
	{ disabled = false }: { disabled?: boolean } = {},
): ChildSpec {
	return { kind: "region", id, box, disabled };
}

export function handle(
	id: string,
	box: Box,
	{
		ariaDisabled = false,
		registered = true,
	}: { ariaDisabled?: boolean; registered?: boolean } = {},
): ChildSpec {
	return { kind: "handle", id, box, ariaDisabled, registered };
}

/** Non-interactive content rendered between a Split's Regions. */
export function staticContent(box: Box): ChildSpec {
	return { kind: "static", box };
}

/** A child that is not an element node, which hit-area code skips. */
export function textNode(): ChildSpec {
	return { kind: "text" };
}

/** A box along a horizontal Split: `top` 0 and `height` 100 unless given. */
export function across(left: number, width: number, top = 0, height = 100) {
	return { x: left, y: top, width, height };
}

/** A box along a vertical Split: `left` 0 and `width` 200 unless given. */
export function down(top: number, height: number, left = 0, width = 200) {
	return { x: left, y: top, width, height };
}

type ElementMembersRead =
	| "nodeType"
	| "ariaDisabled"
	| "hasAttribute"
	| "getBoundingClientRect"
	| "offsetLeft"
	| "offsetTop"
	| "offsetWidth"
	| "offsetHeight";

function fakeElement(
	attributes: string[],
	box: Box,
	ariaDisabled = false,
	nodeType = 1,
): HTMLDivElement {
	const element: Pick<HTMLDivElement, ElementMembersRead> = {
		nodeType,
		ariaDisabled: ariaDisabled ? "true" : null,
		hasAttribute: (name) => attributes.includes(name),
		getBoundingClientRect: () =>
			new DOMRect(box.x, box.y, box.width, box.height),
		offsetLeft: box.x,
		offsetTop: box.y,
		offsetWidth: box.width,
		offsetHeight: box.height,
	};
	// A stand-in: hit-area code reads only the members picked above.
	return element as HTMLDivElement;
}

function fakeSplitElement(
	children: HTMLDivElement[],
	direction: "ltr" | "rtl",
): HTMLElement {
	const element = {
		children,
		ownerDocument: {
			defaultView: { getComputedStyle: () => ({ direction }) },
		},
	};
	// A stand-in: hit-area code reads only `children` and the computed `direction`.
	return element as unknown as HTMLElement;
}

/**
 * A RegisteredSplit whose element's children are `children`, in that DOM
 * order. Handles registered with the Split are the ones not marked
 * `registered: false`; every Region is registered unless listed in
 * `unregisteredRegions`.
 */
export function fakeSplit({
	children,
	orientation = "horizontal",
	direction = "ltr",
	fine = 10,
	coarse = 40,
	disabled = false,
	unregisteredRegions = [],
}: {
	children: ChildSpec[];
	orientation?: Orientation;
	direction?: "ltr" | "rtl";
	fine?: number;
	coarse?: number;
	disabled?: boolean;
	unregisteredRegions?: string[];
}): RegisteredSplit {
	const regions: RegisteredRegion[] = [];
	const handles: RegisteredHandle[] = [];
	const elements = children.map((child) => {
		switch (child.kind) {
			case "region": {
				const element = fakeElement(
					child.disabled
						? ["data-split-region", "data-disabled"]
						: ["data-split-region"],
					child.box,
				);
				if (!unregisteredRegions.includes(child.id)) {
					regions.push({
						id: child.id,
						idIsStable: true,
						element,
						mutableValues: {
							expandToSize: undefined,
							prevSize: undefined,
						},
						onResize: undefined,
						regionConstraints: {},
					});
				}
				return element;
			}
			case "handle": {
				const element = fakeElement(
					["data-split-handle"],
					child.box,
					child.ariaDisabled,
				);
				if (child.registered) {
					handles.push({ id: child.id, element });
				}
				return element;
			}
			case "static": {
				return fakeElement([], child.box);
			}
			default: {
				return fakeElement(
					[],
					{ x: 0, y: 0, width: 0, height: 0 },
					false,
					3,
				);
			}
		}
	});

	return {
		disabled,
		element: fakeSplitElement(elements, direction),
		id: "split",
		mutableState: {
			defaultLayout: undefined,
			disableCursor: false,
			expandedRegionSizes: {},
			layouts: {},
		},
		orientation,
		regions,
		resizeTargetMinimumSize: { coarse, fine },
		handles,
	};
}

/** A HitArea as the ids it pairs and the exact rect it covers. */
export function summarize({ regions, handle, rect }: HitArea) {
	return {
		regions: regions.map(({ id }) => id),
		handle: handle?.id,
		rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
	};
}

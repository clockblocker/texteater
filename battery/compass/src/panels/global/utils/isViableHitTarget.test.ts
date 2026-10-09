import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { type Box, useDomStandIns } from "../test/fakeSplit";
import { isViableHitTarget } from "./isViableHitTarget";

useDomStandIns();

/**
 * Every element's computed style, as stacking-order reads it: nothing
 * creates a stacking context, so a later sibling paints over an earlier one.
 */
const plainStyle = {
	display: "block",
	position: "static",
	zIndex: "auto",
	opacity: "1",
	willChange: "auto",
	getPropertyValue: () => "",
};

const savedGetComputedStyle = Object.getOwnPropertyDescriptor(
	globalThis,
	"getComputedStyle",
);
beforeAll(() => {
	Object.defineProperty(globalThis, "getComputedStyle", {
		configurable: true,
		writable: true,
		value: () => plainStyle,
	});
});
afterAll(() => {
	if (savedGetComputedStyle) {
		Object.defineProperty(
			globalThis,
			"getComputedStyle",
			savedGetComputedStyle,
		);
	} else {
		Reflect.deleteProperty(globalThis, "getComputedStyle");
	}
});

type ElementMembersRead =
	| "nodeType"
	| "parentNode"
	| "parentElement"
	| "childNodes"
	| "contains"
	| "getBoundingClientRect";

type FakeElement = {
	-readonly [Key in ElementMembersRead]: HTMLElement[Key];
};

/** An element covering `box`, adopted as the parent of `children`. */
function element(box: Box, ...children: HTMLElement[]): HTMLElement {
	const fake: FakeElement = {
		nodeType: 1,
		parentNode: null,
		parentElement: null,
		// A stand-in: stacking-order only indexes and measures childNodes.
		childNodes: children as unknown as NodeListOf<ChildNode>,
		contains: (other) => {
			for (let node = other; node; node = node.parentElement) {
				if (node === self) {
					return true;
				}
			}
			return false;
		},
		getBoundingClientRect: () =>
			new DOMRect(box.x, box.y, box.width, box.height),
	};
	// A stand-in: isViableHitTarget and stacking-order read only the members above.
	const self = fake as unknown as HTMLElement;
	for (const child of children) {
		Object.assign(child, { parentNode: self, parentElement: self });
	}
	return self;
}

const page = { x: 0, y: 0, width: 1000, height: 1000 };
/** The Split's one hit area: x 95..105, y 0..100. */
const hitArea = () => new DOMRect(95, 0, 10, 100);

/**
 * `html > body > [splitContainer > split, overlay > label]`, with the
 * overlay before the Split container when `overlayFirst`, so painted below.
 */
function layoutWith({
	overlay: overlayBox,
	label: labelBox = overlayBox,
	overlayFirst = false,
}: {
	overlay: Box;
	label?: Box;
	overlayFirst?: boolean;
}) {
	const split = element({ x: 0, y: 0, width: 200, height: 100 });
	const splitContainer = element(page, split);
	const label = element(labelBox);
	const overlay = element(overlayBox, label);
	element(
		page,
		element(
			page,
			...(overlayFirst
				? [overlay, splitContainer]
				: [splitContainer, overlay]),
		),
	);
	return { split, splitContainer, overlay, label };
}

describe("isViableHitTarget", () => {
	test("is viable when the pointer target is not an element", () => {
		const { split } = layoutWith({ overlay: page });

		expect(
			isViableHitTarget({
				splitElement: split,
				hitArea: hitArea(),
				pointerEventTarget: null,
			}),
		).toBe(true);
	});

	test("is viable for a target inside the Split or containing it", () => {
		const inner = element({ x: 90, y: 0, width: 20, height: 100 });
		const split = element({ x: 0, y: 0, width: 200, height: 100 }, inner);
		const outer = element(page, split);

		for (const pointerEventTarget of [inner, outer]) {
			expect(
				isViableHitTarget({
					splitElement: split,
					hitArea: hitArea(),
					pointerEventTarget,
				}),
			).toBe(true);
		}
	});

	describe("a target painted over the Split", () => {
		test("blocks the hit area it overlaps", () => {
			const { split, overlay } = layoutWith({
				overlay: { x: 50, y: 20, width: 100, height: 40 },
			});

			expect(
				isViableHitTarget({
					splitElement: split,
					hitArea: hitArea(),
					pointerEventTarget: overlay,
				}),
			).toBe(false);
		});

		test("leaves a hit area beside it viable", () => {
			const { split, overlay } = layoutWith({
				overlay: { x: 106, y: 0, width: 100, height: 100 },
			});

			expect(
				isViableHitTarget({
					splitElement: split,
					hitArea: hitArea(),
					pointerEventTarget: overlay,
				}),
			).toBe(true);
		});

		test("blocks through an ancestor that overlaps, though the target itself does not", () => {
			const { split, label } = layoutWith({
				overlay: { x: 50, y: 20, width: 100, height: 40 },
				label: { x: 120, y: 20, width: 20, height: 10 },
			});

			expect(
				isViableHitTarget({
					splitElement: split,
					hitArea: hitArea(),
					pointerEventTarget: label,
				}),
			).toBe(false);
		});
	});

	test("ignores an overlapping target painted under the Split", () => {
		const { split, overlay } = layoutWith({
			overlay: { x: 50, y: 20, width: 100, height: 40 },
			overlayFirst: true,
		});

		expect(
			isViableHitTarget({
				splitElement: split,
				hitArea: hitArea(),
				pointerEventTarget: overlay,
			}),
		).toBe(true);
	});
});

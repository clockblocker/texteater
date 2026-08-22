import {
	CARD_DEMO_GEOMETRY,
	CARD_DEMO_KEYBOARD_ORDER,
	CARD_DEMO_NOTE_KINDS,
	CARD_DEMO_VARIANTS,
	type CardDemoNoteKind,
	type CardDemoVariant,
} from "./card-demo-contract";
import {
	CARD_DEMO_FAKE_TEXT,
	CARD_DEMO_RESOLUTION_CHAIN,
} from "./card-demo-fixtures";
import { cardDemoHref } from "./card-demo-navigation";

export type CardDemoPointer = "mouse" | "touch";
export type CardDemoActivationKey = "Enter" | "Space";
export type CardDemoPointerInterruption =
	| "pointercancel"
	| "lostpointercapture";
export type CardDemoDropPosition =
	| "inside-cancel-zone"
	| "on-cancel-zone-boundary"
	| "outside-cancel-zone";

export interface CardDemoAcceptanceDriver {
	visit(path: string): Promise<void>;
	selectSegment(segmentId: string): Promise<void>;
	expectSelectedSegmentContent(
		segmentId: string,
		text: string,
	): Promise<void>;
	expectTextInteractionAvailable(): Promise<void>;
	expectResolutionChain(kinds: readonly CardDemoNoteKind[]): Promise<void>;
	startCardPointer(
		kind: CardDemoNoteKind,
		pointer: CardDemoPointer,
	): Promise<void>;
	movePointerFromOrigin(distance: number): Promise<void>;
	expectDragActive(active: boolean): Promise<void>;
	moveActiveCard(position: CardDemoDropPosition): Promise<void>;
	expectActiveCardExpanded(kind: CardDemoNoteKind): Promise<void>;
	endCardPointer(): Promise<void>;
	interruptCardPointer(reason: CardDemoPointerInterruption): Promise<void>;
	expectPointerSessionReleased(): Promise<void>;
	expectStackRestored(): Promise<void>;
	expectPath(path: string): Promise<void>;
	tapCard(kind: CardDemoNoteKind): Promise<void>;
	doubleTapCard(kind: CardDemoNoteKind): Promise<void>;
	waitForDoubleTapWindow(): Promise<void>;
	expectNavigationCount(count: number): Promise<void>;
	expectCardFocusOrder(kinds: readonly CardDemoNoteKind[]): Promise<void>;
	expectCardAccessibleName(
		kind: CardDemoNoteKind,
		name: string,
	): Promise<void>;
	focusCard(kind: CardDemoNoteKind): Promise<void>;
	pressCardKey(key: CardDemoActivationKey): Promise<void>;
	pressEscape(): Promise<void>;
	expectCardsDismissed(): Promise<void>;
	expectFocusOnSegment(segmentId: string): Promise<void>;
	setReducedMotion(reduced: boolean): Promise<void>;
	expectReducedMotionApplied(): Promise<void>;
	setRouteTransitionSupport(available: boolean): Promise<void>;
	expectRouteTransitionFallback(): Promise<void>;
	expectInteractionResourcesReleased(): Promise<void>;
}

export type CardDemoAcceptanceScenario = {
	readonly id: string;
	readonly description: string;
	run(
		driver: CardDemoAcceptanceDriver,
		variant: CardDemoVariant,
	): Promise<void>;
};

const selectedSegment = CARD_DEMO_FAKE_TEXT.segments[2];
async function openCards(
	driver: CardDemoAcceptanceDriver,
	variant: CardDemoVariant,
) {
	await driver.visit(cardDemoHref({ page: "text", variant }));
	await driver.selectSegment(selectedSegment.id);
}

export const CARD_DEMO_ACCEPTANCE_SCENARIOS = [
	{
		id: "all-fake-segments-share-one-contract",
		description:
			"Every fake Segment updates the open shared chain in one click.",
		async run(driver, variant) {
			await driver.visit(cardDemoHref({ page: "text", variant }));
			for (const segment of CARD_DEMO_FAKE_TEXT.segments) {
				await driver.selectSegment(segment.id);
				await driver.expectSelectedSegmentContent(
					segment.id,
					segment.text,
				);
				await driver.expectResolutionChain(CARD_DEMO_NOTE_KINDS);
				await driver.expectTextInteractionAvailable();
			}
			const lastSegment = CARD_DEMO_FAKE_TEXT.segments.at(-1);
			if (!lastSegment) return;
			await driver.pressEscape();
			await driver.expectFocusOnSegment(lastSegment.id);
		},
	},
	{
		id: "threshold-and-cancel-zone-boundary",
		description:
			"The shared threshold activates drag; the boundary cancels and outside opens.",
		async run(driver, variant) {
			await openCards(driver, variant);
			await driver.startCardPointer("surface", "mouse");
			await driver.movePointerFromOrigin(
				CARD_DEMO_GEOMETRY.dragActivationDistance - 1,
			);
			await driver.expectDragActive(false);
			await driver.movePointerFromOrigin(
				CARD_DEMO_GEOMETRY.dragActivationDistance,
			);
			await driver.expectDragActive(true);
			await driver.moveActiveCard("on-cancel-zone-boundary");
			await driver.endCardPointer();
			await driver.expectStackRestored();
			await openCards(driver, variant);
			await driver.startCardPointer("surface", "mouse");
			await driver.movePointerFromOrigin(
				CARD_DEMO_GEOMETRY.dragActivationDistance,
			);
			await driver.moveActiveCard("outside-cancel-zone");
			await driver.expectActiveCardExpanded("surface");
			await driver.endCardPointer();
			await driver.expectPath(
				cardDemoHref({ page: "note", variant, noteKind: "surface" }),
			);
			await driver.expectSelectedSegmentContent(
				selectedSegment.id,
				selectedSegment.text,
			);
			await openCards(driver, variant);
			await driver.startCardPointer("lemma", "touch");
			await driver.movePointerFromOrigin(
				CARD_DEMO_GEOMETRY.dragActivationDistance,
			);
			await driver.moveActiveCard("outside-cancel-zone");
			await driver.endCardPointer();
			await driver.expectPath(
				cardDemoHref({ page: "note", variant, noteKind: "lemma" }),
			);
		},
	},
	{
		id: "pointer-interruptions-release-and-restore",
		description:
			"pointercancel and lost capture restore without leaked state.",
		async run(driver, variant) {
			for (const reason of [
				"pointercancel",
				"lostpointercapture",
			] as const) {
				await openCards(driver, variant);
				await driver.startCardPointer("lemma", "touch");
				await driver.movePointerFromOrigin(
					CARD_DEMO_GEOMETRY.dragActivationDistance,
				);
				await driver.interruptCardPointer(reason);
				await driver.expectPointerSessionReleased();
				await driver.expectStackRestored();
			}
		},
	},
	{
		id: "tap-arbitration-navigates-once",
		description: "Single tap does not open; double-tap opens exactly once.",
		async run(driver, variant) {
			await openCards(driver, variant);
			await driver.tapCard("attestation");
			await driver.waitForDoubleTapWindow();
			await driver.expectNavigationCount(0);
			await driver.doubleTapCard("attestation");
			await driver.expectNavigationCount(1);
			await driver.waitForDoubleTapWindow();
			await driver.expectNavigationCount(1);
			await driver.expectPath(
				cardDemoHref({
					page: "note",
					variant,
					noteKind: "attestation",
				}),
			);
		},
	},
	{
		id: "keyboard-order-names-activation-and-focus-restoration",
		description:
			"Keyboard order, names, activation, and focus restoration are shared.",
		async run(driver, variant) {
			await openCards(driver, variant);
			await driver.expectCardFocusOrder(CARD_DEMO_KEYBOARD_ORDER);
			for (const card of CARD_DEMO_RESOLUTION_CHAIN) {
				await driver.expectCardAccessibleName(
					card.kind,
					`Open ${card.label} Note for ${selectedSegment.text}`,
				);
			}
			await driver.pressEscape();
			await driver.expectCardsDismissed();
			await driver.expectFocusOnSegment(selectedSegment.id);
			for (const kind of CARD_DEMO_NOTE_KINDS) {
				for (const key of ["Enter", "Space"] as const) {
					await openCards(driver, variant);
					await driver.focusCard(kind);
					await driver.pressCardKey(key);
					await driver.expectPath(
						cardDemoHref({ page: "note", variant, noteKind: kind }),
					);
				}
			}
		},
	},
	{
		id: "reduced-motion-contract",
		description:
			"Reduced-motion mode preserves behavior without nonessential motion.",
		async run(driver, variant) {
			await driver.setReducedMotion(true);
			await openCards(driver, variant);
			await driver.expectReducedMotionApplied();
			await driver.pressEscape();
			await driver.setReducedMotion(false);
		},
	},
	{
		id: "route-transition-fallback",
		description: "Navigation works when route transitions are unavailable.",
		async run(driver, variant) {
			await driver.setRouteTransitionSupport(false);
			await openCards(driver, variant);
			await driver.doubleTapCard("reading");
			await driver.expectRouteTransitionFallback();
			await driver.expectPath(
				cardDemoHref({ page: "note", variant, noteKind: "reading" }),
			);
		},
	},
	{
		id: "repeat-cycle-cleanup",
		description:
			"Repeated cycles release listeners, captures, timers, and styles.",
		async run(driver, variant) {
			for (let cycle = 0; cycle < 5; cycle += 1) {
				await openCards(driver, variant);
				await driver.pressEscape();
				await driver.expectFocusOnSegment(selectedSegment.id);
				await driver.expectInteractionResourcesReleased();
			}
		},
	},
] as const satisfies readonly CardDemoAcceptanceScenario[];

export async function runCardDemoAcceptanceSuite(
	driver: CardDemoAcceptanceDriver,
): Promise<void> {
	for (const variant of CARD_DEMO_VARIANTS) {
		for (const scenario of CARD_DEMO_ACCEPTANCE_SCENARIOS)
			await scenario.run(driver, variant);
	}
}

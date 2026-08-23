import { expect, test } from "bun:test";
import {
	CARD_DEMO_ACCEPTANCE_SCENARIOS,
	type CardDemoAcceptanceDriver,
	runCardDemoAcceptanceSuite,
} from "../src/playground/card-demo/card-demo-acceptance";
import {
	CARD_DEMO_GEOMETRY,
	CARD_DEMO_NOTE_KINDS,
	CARD_DEMO_VARIANT,
	type CardDemoNoteKind,
} from "../src/playground/card-demo/card-demo-contract";
import { CARD_DEMO_FAKE_TEXT } from "../src/playground/card-demo/card-demo-fixtures";
import { cardDemoHref } from "../src/playground/card-demo/card-demo-navigation";

class RecordingDriver implements CardDemoAcceptanceDriver {
	readonly events: string[] = [];
	private record(event: string) {
		this.events.push(event);
		return Promise.resolve();
	}
	visit = (path: string) => this.record(`visit:${path}`);
	selectSegment = (id: string) => this.record(`select:${id}`);
	expectSelectedSegmentContent = (id: string, text: string) =>
		this.record(`content:${id}:${text}`);
	expectTextInteractionAvailable = () => this.record("text:interactive");
	expectResolutionChain = (kinds: readonly CardDemoNoteKind[]) =>
		this.record(`chain:${kinds.join(",")}`);
	startCardPointer = (kind: CardDemoNoteKind, pointer: "mouse" | "touch") =>
		this.record(`pointer:${pointer}:${kind}`);
	movePointerFromOrigin = (distance: number) =>
		this.record(`move:${distance}`);
	expectDragActive = (active: boolean) =>
		this.record(`drag-active:${active}`);
	moveActiveCard = (position: string) => this.record(`position:${position}`);
	expectActiveCardExpanded = (kind: CardDemoNoteKind) =>
		this.record(`expanded:${kind}`);
	endCardPointer = () => this.record("pointer:end");
	interruptCardPointer = (reason: string) =>
		this.record(`interrupt:${reason}`);
	expectPointerSessionReleased = () => this.record("pointer:released");
	expectStackRestored = () => this.record("stack:restored");
	expectPath = (path: string) => this.record(`path:${path}`);
	tapCard = (kind: CardDemoNoteKind) => this.record(`tap:${kind}`);
	doubleTapCard = (kind: CardDemoNoteKind) =>
		this.record(`double-tap:${kind}`);
	waitForDoubleTapWindow = () => this.record("double-tap:wait");
	expectNavigationCount = (count: number) =>
		this.record(`navigation-count:${count}`);
	expectCardFocusOrder = (kinds: readonly CardDemoNoteKind[]) =>
		this.record(`focus-order:${kinds.join(",")}`);
	expectCardAccessibleName = (kind: CardDemoNoteKind, name: string) =>
		this.record(`name:${kind}:${name}`);
	focusCard = (kind: CardDemoNoteKind) => this.record(`focus:${kind}`);
	pressCardKey = (key: "Enter" | "Space") => this.record(`key:${key}`);
	pressEscape = () => this.record("key:Escape");
	expectCardsDismissed = () => this.record("cards:dismissed");
	expectFocusOnSegment = (id: string) => this.record(`focus-segment:${id}`);
	setReducedMotion = (reduced: boolean) =>
		this.record(`reduced-motion:${reduced}`);
	expectReducedMotionApplied = () => this.record("reduced-motion:applied");
	setRouteTransitionSupport = (available: boolean) =>
		this.record(`route-transition:${available}`);
	expectRouteTransitionFallback = () =>
		this.record("route-transition:fallback");
	expectInteractionResourcesReleased = () =>
		this.record("resources:released");
}

test("encodes every non-compensable gate for Motion", async () => {
	const driver = new RecordingDriver();
	await runCardDemoAcceptanceSuite(driver);
	for (const segment of CARD_DEMO_FAKE_TEXT.segments)
		expect(driver.events).toContain(`select:${segment.id}`);
	expect(driver.events).toContain("text:interactive");
	expect(driver.events).toContain(
		`move:${CARD_DEMO_GEOMETRY.dragActivationDistance - 1}`,
	);
	expect(driver.events).toContain(
		`move:${CARD_DEMO_GEOMETRY.dragActivationDistance}`,
	);
	expect(driver.events).toContain("position:on-cancel-zone-boundary");
	expect(driver.events).toContain("interrupt:pointercancel");
	expect(driver.events).toContain("interrupt:lostpointercapture");
	expect(driver.events).toContain("tap:attestation");
	expect(driver.events).toContain("navigation-count:0");
	expect(
		driver.events.filter((event) => event === "navigation-count:1").length,
	).toBeGreaterThan(1);
	expect(driver.events).toContain(
		"focus-order:reading,lemma,surface,attestation",
	);
	expect(driver.events).toContain("reduced-motion:applied");
	expect(driver.events).toContain("route-transition:fallback");
	expect(driver.events).toContain("resources:released");
	for (const noteKind of CARD_DEMO_NOTE_KINDS) {
		expect(driver.events).toContain(
			`path:${cardDemoHref({
				page: "note",
				variant: CARD_DEMO_VARIANT,
				noteKind,
			})}`,
		);
	}
	expect(
		new Set(CARD_DEMO_ACCEPTANCE_SCENARIOS.map((scenario) => scenario.id))
			.size,
	).toBe(CARD_DEMO_ACCEPTANCE_SCENARIOS.length);
});

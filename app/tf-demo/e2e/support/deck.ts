/// <reference lib="dom" />
import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Pointer gestures and frame sampling shared by the deck's motion and
 * gesture specs, which run in the playground on the production Compass.
 */

export async function startDrag(
	page: Page,
	card: Locator,
	dx: number,
	dy: number,
) {
	const heading = await card.locator("[data-heading]").boundingBox();
	if (!heading) throw new Error("Missing heading geometry");
	const x = heading.x + heading.width / 2;
	const y = heading.y + heading.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + dx, y + dy, { steps: 5 });
}

/** A Cover is handled by its Heading: drag from its free middle, clear of its ← button. */
export async function startHeadingDrag(
	page: Page,
	sheet: Locator,
	dx: number,
	dy: number,
) {
	const bar = await sheet.locator("[data-heading]").boundingBox();
	if (!bar) throw new Error("Missing cover heading geometry");
	const x = bar.x + bar.width * 0.6;
	const y = bar.y + bar.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + dx, y + dy, { steps: 5 });
}

export async function openSheet(page: Page, frame: Locator) {
	await startDrag(page, frame.locator('[data-place="open"]'), 0, -120);
	await page.mouse.up();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
}

export async function cardState(frame: Locator) {
	return frame.locator('[data-form="card"]').evaluateAll((cards) =>
		cards.map((card) => ({
			label: card.getAttribute("aria-label"),
			place: card.getAttribute("data-place"),
			text: card.textContent,
		})),
	);
}

/** One frame of an element, as `armFrames` read it. */
type Frame = {
	/** ms from the release that `armFrames` waited for; negative before it. */
	readonly t: number;
	readonly x: number;
	readonly y: number;
	readonly z: number;
	readonly held: boolean;
	readonly place: string | null;
	/** How far below its top its Heading sits, in its own unscaled px. */
	readonly heading: number | null;
};

/**
 * Reads `target` every frame from now until `afterMs` past the next
 * pointerup, and times each frame from that release. Arm it before the
 * action it watches and await what it returns after: armed first, it
 * sees the release however long the action takes to land on a loaded
 * machine.
 */
export async function armFrames(target: Locator, afterMs: number) {
	const sampler = await target.evaluateHandle((element, ms) => {
		let releasedAt: number | null = null;
		window.addEventListener(
			"pointerup",
			(event) => {
				releasedAt = event.timeStamp;
			},
			{ capture: true, once: true },
		);
		const read = () => {
			const box = element.getBoundingClientRect();
			const heading = element.querySelector("[data-heading]");
			const scale = box.height / (element as HTMLElement).offsetHeight;
			return {
				at: performance.now(),
				x: box.x,
				y: box.y,
				z: Number(getComputedStyle(element).zIndex),
				held: element.getAttribute("data-held") === "true",
				place: element.getAttribute("data-place"),
				heading: heading
					? (heading.getBoundingClientRect().top - box.top) / scale
					: null,
			};
		};
		const taken = [read()];
		const frames = (async () => {
			const armedAt = performance.now();
			while (
				releasedAt === null
					? performance.now() - armedAt < 10_000
					: performance.now() - releasedAt < ms
			) {
				await new Promise<void>((resolve) =>
					requestAnimationFrame(() => resolve()),
				);
				taken.push(read());
			}
			const from = releasedAt ?? armedAt;
			return taken.map(({ at, ...frame }) => ({
				...frame,
				t: at - from,
			}));
		})();
		return { frames };
	}, afterMs);
	return async (): Promise<Frame[]> =>
		sampler.evaluate((armed) => armed.frames);
}

/**
 * How far an unselected Card's Heading travels inside it, from the frame
 * it stopped being the open one: zero when the change is instant.
 */
export function headingTravel(frames: readonly Frame[]) {
	const offsets = frames
		.filter((frame) => frame.place !== "open")
		.map((frame) => frame.heading ?? Number.NaN);
	expect(offsets.length).toBeGreaterThan(0);
	return Math.max(...offsets) - Math.min(...offsets);
}

/** When, after the release, the Card arrived home, and when — and where — the Deck closed over it. */
export function arrival(
	frames: readonly Frame[],
	home: { x: number; y: number },
) {
	const after = frames
		.filter((frame) => frame.t >= 0)
		.map((frame) => ({
			t: frame.t,
			d: Math.hypot(frame.x - home.x, frame.y - home.y),
			z: frame.z,
		}));
	const arrived = after.find((sample) => sample.d <= 8);
	const closed = after.find((sample) => sample.z < 40);
	return {
		homeAt: arrived?.t ?? null,
		closedAt: closed?.t ?? null,
		closedFrom: closed?.d ?? null,
	};
}

/** Where a gesture's pointer goes next, and how many ms after its last point. */
export type Stroke = readonly [dx: number, dy: number, afterMs: number];

/**
 * Presses at (`x`, `y`), moves through `path` and lets go `releaseMs`
 * after its last point, every event stamped at the time the path gives
 * it and the whole gesture sent at once. A throw then has the speed the
 * test says, not the pace a loaded machine lets Playwright's one round
 * trip per step land at, and none of the app's real-time waits can fall
 * between two of its points.
 */
export async function stampedGesture(
	page: Page,
	x: number,
	y: number,
	path: readonly Stroke[],
	releaseMs: number,
) {
	const cdp = await page.context().newCDPSession(page);
	const pressedAt = Date.now();
	const send = (
		type: "mousePressed" | "mouseMoved" | "mouseReleased",
		at: { x: number; y: number },
		ms: number,
	) =>
		cdp.send("Input.dispatchMouseEvent", {
			type,
			x: at.x,
			y: at.y,
			button: "left",
			buttons: type === "mouseReleased" ? 0 : 1,
			clickCount: type === "mouseMoved" ? 0 : 1,
			timestamp: (pressedAt + ms) / 1000,
		});
	let at = { x, y };
	let ms = 0;
	const sent = [send("mousePressed", at, ms)];
	for (const [dx, dy, afterMs] of path) {
		at = { x: x + dx, y: y + dy };
		ms += afterMs;
		sent.push(send("mouseMoved", at, ms));
	}
	sent.push(send("mouseReleased", at, ms + releaseMs));
	await Promise.all(sent);
	await cdp.detach();
}

/** `n` even strokes of (`dx`, `dy`), `ms` apart. */
export function strokes(
	n: number,
	dx: number,
	dy: number,
	ms: number,
): Stroke[] {
	return Array.from(
		{ length: n },
		(_, i) => [(i + 1) * dx, (i + 1) * dy, ms] as const,
	);
}

export async function selectedScale(specimen: Locator) {
	return specimen
		.locator('[data-place="open"]')
		.evaluate(
			(card) =>
				card.getBoundingClientRect().width /
				(card as HTMLElement).offsetWidth,
		);
}

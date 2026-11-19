import { expect, type Page, test } from "@playwright/test";
import { pileCards, presentationMetrics } from "./support/card-foundation";
import { chooseVariant, landed } from "./support/deck-interactions";
import { choose } from "./support/deck-interactions-tap";

/**
 * One foundation draws a Presentation in the app's renderer, in the Notes
 * gallery and in Deck interactions (#1344): the same Note computes to the
 * same box, Heading row and Body in each, and a dealt Deck rests in the
 * same pile. The app's renderer runs in the Deck models playground, which
 * deals the fake db's Dämmerung Reading through the production Compass;
 * Deck interactions deals the fake db's `zur Bank` click. A surface that
 * skins a box, lays out a Heading row or builds a pile of its own fails
 * here.
 */

test.use({ viewport: { width: 1600, height: 1100 } });

/** The Notes gallery, showing the Note of `kind` of the unit its catalog lists as `unit`. */
async function openGallery(
	page: Page,
	unit = "Dämmerung",
	kind: "Attest" | "Reading" = "Reading",
) {
	await page.goto("/playground/notes");
	await page
		.getByRole("navigation", { name: "Fake db" })
		.locator("li")
		.filter({ hasText: unit })
		.getByRole("button", { name: kind, exact: true })
		.click();
	await expect(
		page.locator('[data-presentation="card"] [data-note-presentation]'),
	).toBeVisible();
}

/** Deck interactions with its Deck dealt and at rest. */
async function dealInDeckInteractions(page: Page, variant: string) {
	await page.goto("/playground/deck-interactions");
	await chooseVariant(page, variant);
	const frame = page.locator("[data-deck-frame]");
	await expect(frame.locator("[data-card-id]")).toHaveCount(4);
	await landed(page);
	return frame;
}

/** The app's renderer with a Deck dealt whose front Card is the Dämmerung Reading. */
async function dealInApp(page: Page) {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="Dämmerung"]').first().click();
	await expect(
		frame.locator('[data-presentation="card"] [data-note-presentation]'),
	).toBeVisible();
	return frame;
}

for (const motion of ["no-preference", "reduce"] as const) {
	test.describe(`with prefers-reduced-motion: ${motion}`, () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ reducedMotion: motion });
		});

		test("a Card in front is the same box, Heading row and Body in the app and in the Notes gallery", async ({
			page,
		}) => {
			const frame = await dealInApp(page);
			const app = await presentationMetrics(
				frame.locator('[data-presentation="card"]'),
			);
			await openGallery(page);
			const gallery = await presentationMetrics(
				page.locator('[data-presentation="card"]'),
			);
			expect(gallery).toEqual(app);
			/* and the box is the paper: a wrong skin would agree with itself */
			expect(app.box.radius).toBe("14.4px");
			expect(app.box.contain).toBe("layout paint");
			expect(app.box.shadow).not.toBe("none");
			expect(app.heading.height).toBe(48);
			expect(app.fade.opacity).toBe("1");
		});

		test("a Card Tail is the same Heading row over a clipped Body in both", async ({
			page,
		}) => {
			const frame = await dealInApp(page);
			const app = await presentationMetrics(
				frame.locator('[data-presentation="tail-above"]').first(),
			);
			await openGallery(page);
			const gallery = await presentationMetrics(
				page.locator('[data-presentation="tail-above"]'),
			);
			/* the app's Card behind is a dummy Note; the row and the clip
			   around it are the foundation's */
			expect({
				...gallery,
				title: null,
				body: gallery.body.overflowY,
			}).toEqual({
				...app,
				title: null,
				body: app.body.overflowY,
			});
			expect(app.body.overflowY).toBe("hidden");
		});

		test("a Cover is the same bar over the same Body in both", async ({
			page,
		}) => {
			const frame = await dealInApp(page);
			await frame.locator('[data-presentation="card"]').dblclick();
			const cover = frame.locator('[data-presentation="cover"]');
			await expect(cover).toBeVisible();
			/* the bar grows and the Card's fade lifts as the Cover lands; a
			   Cover's Heading is 5.5rem, room for the title set large */
			await expect
				.poll(async () => {
					const { heading, fade } = await presentationMetrics(cover);
					return [heading.height, fade.opacity];
				})
				.toEqual([88, "0"]);
			const app = await presentationMetrics(cover);
			await openGallery(page);
			const gallery = await presentationMetrics(
				page.locator('[data-presentation="cover"]'),
			);
			/* a Cover is as wide as its Pane, so its title sits where its
			   column does; everything else is the foundation's */
			const sized = (metrics: typeof app) => ({
				...metrics,
				box: { ...metrics.box, width: 0 },
				title: metrics.title && { ...metrics.title, left: 0 },
			});
			expect(sized(gallery)).toEqual(sized(app));
			expect(app.fade.opacity).toBe("0");
			expect(app.body.notePadding).toBe("0px 40px 56px");
		});

		for (const variant of ["D · Swipe actions"]) {
			test(`${variant}: a Card of Deck interactions is the same box, Heading row and Body as in the Notes gallery`, async ({
				page,
			}) => {
				const frame = await dealInDeckInteractions(page, variant);
				const front = await presentationMetrics(
					frame.locator('[data-card-id="reading"]'),
				);
				const back = await presentationMetrics(
					frame.locator('[data-card-id="attestation"]'),
				);
				await openGallery(page, "🏦");
				expect(
					await presentationMetrics(
						page.locator('[data-presentation="card"]'),
					),
				).toEqual(front);
				await openGallery(page, "🏦", "Attest");
				/* folded above the open Card it is a Card Tail, as in the
				   app: the same Card, its Body only not scrolling */
				const card = await presentationMetrics(
					page.locator('[data-presentation="card"]'),
				);
				expect({
					...card,
					body: { ...card.body, overflowY: "hidden" },
				}).toEqual(back);
				expect(front.box.radius).toBe("14.4px");
				expect(front.heading.height).toBe(48);
			});
		}

		test("a Cover of Deck interactions is the same bar over the same Body as in the Notes gallery", async ({
			page,
		}) => {
			const frame = await dealInDeckInteractions(
				page,
				"D · Swipe actions",
			);
			await frame.locator('[data-card-id="reading"]').dblclick();
			const cover = frame.locator('[data-presentation="cover"]');
			await expect(cover).toBeVisible();
			await landed(page);
			/* the box takes the Cover's form at once; its Note follows */
			await expect
				.poll(async () => {
					const { heading, fade } = await presentationMetrics(cover);
					return [heading.height, fade.opacity];
				})
				.toEqual([88, "0"]);
			const opened = await presentationMetrics(cover);
			await openGallery(page, "🏦");
			const gallery = await presentationMetrics(
				page.locator('[data-presentation="cover"]'),
			);
			const sized = (metrics: typeof opened) => ({
				...metrics,
				box: { ...metrics.box, width: 0 },
				title: metrics.title && { ...metrics.title, left: 0 },
			});
			expect(sized(opened)).toEqual(sized(gallery));
			expect(opened.heading.height).toBe(88);
		});

		test("a Cover's title is the page's headword, on its Blocks' leading edge", async ({
			page,
		}) => {
			await openGallery(page);
			const cover = page.locator('[data-presentation="cover"]');
			const read = () =>
				cover.evaluate((element) => {
					const at = (selector: string) => {
						const found = element.querySelector(selector);
						if (!found) throw new Error(`Missing ${selector}`);
						return found;
					};
					const title = at("[data-heading] [data-slot=note-title]");
					const start = (node: Element) =>
						Math.round(node.getBoundingClientRect().left);
					return {
						title: start(title),
						block: start(at("[data-slot=note-section-label]")),
						tags: start(at("[data-slot=note-tags]")),
						back: start(at('[data-heading-chrome="back"]')),
						size: getComputedStyle(title).fontSize,
					};
				});
			/* the Stage is wider than the Notes page's column here, which is
			   where a title once started 2.5rem before its Blocks */
			const wide = await read();
			expect(wide.title).toBe(wide.block);
			expect(wide.tags).toBe(wide.block);
			expect(wide.back).toBeLessThan(wide.title);
			expect(wide.size).toBe("28px");
			/* a phone's Pane: the same edge, and a headword that gives a
			   little so several words fit */
			await page.setViewportSize({ width: 724, height: 1100 });
			const narrow = await read();
			expect(narrow.title).toBe(narrow.block);
			expect(Number.parseFloat(narrow.size)).toBeLessThan(28);
			expect(Number.parseFloat(narrow.size)).toBeGreaterThanOrEqual(22);
		});

		test("a dealt Deck rests in the same pile in the app and in Deck interactions", async ({
			page,
		}) => {
			const app = await pileCards(
				await dealInApp(page),
				'[data-form="card"]',
			);
			/* on a wide screen D gives the Deck its own Pane beside the other
			   one, so the frame is the Deck's whole Pane only on a phone */
			const frame = await dealInDeckInteractions(
				page,
				"D · Swipe actions",
			);
			await choose(page, "Width", "phone");
			await page.mouse.move(5, 5);
			await landed(page);
			const prototype = await pileCards(frame, "[data-card-id]");
			const rounded = (cards: typeof app) =>
				cards.map((card) => ({
					width: card.width,
					height: card.height,
					top: Math.round(card.top * 10) / 10,
					middle: Math.round(card.middle * 10) / 10,
					drawnWidth: Math.round(card.drawnWidth * 10) / 10,
				}));
			expect(rounded(prototype)).toEqual(rounded(app));
			/* and it is the pile: whole Cards a Heading row apart, the
			   front one alone at the open scale, grown from its top edge */
			expect(app).toHaveLength(4);
			expect(app.map((card) => card.width)).toEqual([416, 416, 416, 416]);
			expect(
				app
					.slice(1)
					.map((card, index) =>
						Math.round(card.top - (app[index]?.top ?? 0)),
					),
			).toEqual([48, 48, 48]);
			expect(app.at(-1)?.drawnWidth).toBeCloseTo(416 * 1.05, 1);
		});
	});
}

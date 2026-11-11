import { expect, type Page, test } from "@playwright/test";
import { presentationMetrics } from "./support/card-foundation";

/**
 * One foundation draws a Presentation in the app's renderer and in the
 * Notes gallery (#1344): the same Note computes to the same box, Heading
 * row and Body in each. The app's renderer runs in the Deck models
 * playground, which deals the fake db's Dämmerung Reading through the
 * production Compass. A surface that skins a box or lays out a Heading row
 * of its own fails here.
 */

test.use({ viewport: { width: 1600, height: 1100 } });

/** The Notes gallery, showing the Dämmerung Reading. */
async function openGallery(page: Page) {
	await page.goto("/playground/notes");
	await page
		.getByRole("navigation", { name: "Fake db" })
		.locator("li")
		.filter({ hasText: "Dämmerung" })
		.getByRole("button", { name: "Reading", exact: true })
		.click();
	await expect(
		page.locator('[data-presentation="card"] [data-note-presentation]'),
	).toBeVisible();
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
			/* the bar grows and the Card's fade lifts as the Cover lands */
			await expect
				.poll(async () => {
					const { heading, fade } = await presentationMetrics(cover);
					return [heading.height, fade.opacity];
				})
				.toEqual([72, "0"]);
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
	});
}

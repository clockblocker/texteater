import { expect, type Locator, type Page, test } from "@playwright/test";

const workspacePath = "/playground/sheet-workspace/motion";
const workspaceVariants = [
	"motion",
	"dnd-kit",
	"pragmatic",
	"react-aria",
] as const;

function pane(page: Page, name: "west" | "central" | "east") {
	return page.getByRole("region", { name: `${name} Pane`, exact: true });
}

async function openResolutionCards(page: Page, segment: string) {
	await page.getByRole("button", { name: segment, exact: true }).click();
	await expect(
		page.getByRole("dialog", {
			name: `Resolution Chain for ${segment}`,
			exact: true,
		}),
	).toBeVisible();
}

async function dragCardToPane(
	page: Page,
	card: Locator,
	targetPane: Locator,
	beforeDrop?: (destination: { x: number; y: number }) => Promise<void>,
) {
	const cardBox = await card.boundingBox();
	const paneBox = await targetPane.boundingBox();
	if (!cardBox || !paneBox) throw new Error("Card and Pane must be visible.");

	const start = {
		x: cardBox.x + cardBox.width / 2,
		y: cardBox.y + cardBox.height / 2,
	};
	const destination = {
		x: paneBox.x + paneBox.width / 2,
		y: paneBox.y + paneBox.height / 2,
	};

	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 12, start.y);
	await expect(card).toHaveAttribute("data-drag-active", "true");
	await expect(page.locator('[data-drop-target="true"]')).toHaveCount(0);
	await page.mouse.move(destination.x, destination.y, { steps: 8 });
	await page.mouse.move(destination.x, destination.y);
	await beforeDrop?.(destination);
	await page.mouse.up();
}

async function holdCardOverCentralPane(page: Page, card: Locator) {
	const cardBox = await card.boundingBox();
	const centralBox = await pane(page, "central").boundingBox();
	if (!cardBox || !centralBox)
		throw new Error("Card and central Pane must be visible.");

	const start = {
		x: cardBox.x + cardBox.width / 2,
		y: cardBox.y + cardBox.height / 2,
	};
	const destination = {
		x: centralBox.x + centralBox.width / 2,
		y: centralBox.y + 80,
	};
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 12, start.y);
	await page.mouse.move(destination.x, destination.y, { steps: 8 });
	await page.mouse.move(destination.x, destination.y);
}

async function holdTopSheetOverPane(page: Page, targetPane: Locator) {
	const handle = page.getByRole("button", {
		name: "Drag top Sheet",
		exact: true,
	});
	const handleBox = await handle.boundingBox();
	const paneBox = await targetPane.boundingBox();
	if (!handleBox || !paneBox)
		throw new Error("Sheet handle and target Pane must be visible.");

	const start = {
		x: handleBox.x + handleBox.width / 2,
		y: handleBox.y + handleBox.height / 2,
	};
	const destination = {
		x: paneBox.x + paneBox.width / 2,
		y: paneBox.y + paneBox.height / 2,
	};
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 12, start.y);
	await page.mouse.move(destination.x, destination.y, { steps: 8 });
	await page.mouse.move(destination.x, destination.y);
	return destination;
}

test.beforeEach(async ({ page }) => {
	await page.goto(workspacePath);
	await expect(
		pane(page, "central").locator('[data-sheet-id="sheet-central-text"]'),
	).toBeVisible();
});

test("the Card stack stays nonmodal and an unoccupied click dismisses it", async ({
	page,
}) => {
	await openResolutionCards(page, "Lorem");
	const overlay = page.locator("[data-card-demo-overlay]");
	await expect(overlay).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

	const ipsum = page.getByRole("button", { name: "ipsum", exact: true });
	const restingBackground = await ipsum.evaluate(
		(element) =>
			element.ownerDocument.defaultView?.getComputedStyle(element)
				.backgroundColor ?? "",
	);
	await ipsum.hover();
	await expect
		.poll(() =>
			ipsum.evaluate(
				(element) =>
					element.ownerDocument.defaultView?.getComputedStyle(element)
						.backgroundColor ?? "",
			),
		)
		.not.toBe(restingBackground);
	await ipsum.click();
	await expect(
		page.getByRole("dialog", {
			name: "Resolution Chain for ipsum",
			exact: true,
		}),
	).toBeVisible();

	const textSheetBox = await page
		.locator(".sheet-workspace-text-sheet")
		.boundingBox();
	if (!textSheetBox) throw new Error("Text Sheet must be visible.");
	await page.mouse.click(textSheetBox.x + 4, textSheetBox.y + 4);
	await expect(overlay).toHaveCount(0);
});

test("dragging a Card to a Pane places the Note there and Escape removes it", async ({
	page,
}) => {
	await openResolutionCards(page, "Lorem");
	const readingCard = page.getByRole("button", {
		name: "Open Reading Note for Lorem",
		exact: true,
	});
	const east = pane(page, "east");

	await dragCardToPane(page, readingCard, east, async () => {
		await expect(east).toHaveAttribute("data-drop-target", "true");
		await expect
			.poll(() =>
				east.evaluate(
					(element) =>
						element.ownerDocument.defaultView?.getComputedStyle(
							element,
						).boxShadow ?? "none",
				),
			)
			.not.toBe("none");
	});

	await expect(east.locator("[data-sheet-id]")).toHaveCount(1);
	await expect(east.locator('[data-card-demo-note="reading"]')).toBeVisible();
	await expect(east).toHaveAttribute("data-active", "true");
	await page.keyboard.press("Escape");
	await expect(east.locator("[data-sheet-id]")).toHaveCount(0);
});

for (const variant of workspaceVariants) {
	test(`${variant}: an occupied central Pane paints its Card-drop highlight in the foreground`, async ({
		page,
	}) => {
		await page.goto(`/playground/sheet-workspace/${variant}`);
		await openResolutionCards(page, "Lorem");
		const central = pane(page, "central");
		await holdCardOverCentralPane(
			page,
			page.getByRole("button", {
				name: "Open Reading Note for Lorem",
				exact: true,
			}),
		);
		await expect(central).toHaveAttribute("data-drop-target", "true");
		await expect
			.poll(() =>
				central.evaluate((element) => {
					const highlight =
						element.ownerDocument.defaultView?.getComputedStyle(
							element,
							"::after",
						);
					return {
						content: highlight?.content,
						opacity: highlight?.opacity,
						boxShadow: highlight?.boxShadow,
					};
				}),
			)
			.toMatchObject({
				content: expect.not.stringMatching(/^none$/),
				opacity: "1",
				boxShadow: expect.not.stringMatching(/^none$/),
			});
		await page.mouse.up();
	});
}

test("dnd-kit keeps the compact top-Sheet Card under the pointer and above Panes", async ({
	page,
}) => {
	await page.goto("/playground/sheet-workspace/dnd-kit");
	const east = pane(page, "east");
	const destination = await holdTopSheetOverPane(page, east);
	await expect(east).toHaveAttribute("data-drop-target", "true");
	const previewBox = await page
		.locator("[data-transient-card]")
		.boundingBox();
	if (!previewBox) throw new Error("The compact Sheet Card must be visible.");
	expect(destination.x).toBeGreaterThanOrEqual(previewBox.x);
	expect(destination.x).toBeLessThanOrEqual(previewBox.x + previewBox.width);
	expect(destination.y).toBeGreaterThanOrEqual(previewBox.y);
	expect(destination.y).toBeLessThanOrEqual(previewBox.y + previewBox.height);
	await page.mouse.up();
});

for (const variant of workspaceVariants) {
	test(`${variant}: a dragged Resolution Card paints above the neighboring Pane`, async ({
		page,
	}) => {
		await page.goto(`/playground/sheet-workspace/${variant}`);
		await openResolutionCards(page, "Lorem");
		const east = pane(page, "east");
		await dragCardToPane(
			page,
			page.getByRole("button", {
				name: "Open Reading Note for Lorem",
				exact: true,
			}),
			east,
			async (destination) => {
				await expect(east).toHaveAttribute("data-drop-target", "true");
				const topCardKind = await page
					.locator('[data-card-demo-card="reading"]')
					.evaluate(
						(element, { x, y }) =>
							element.ownerDocument
								.elementFromPoint(x, y)
								?.closest("[data-card-demo-card]")
								?.getAttribute("data-card-demo-card"),
						destination,
					);
				expect(topCardKind).toBe("reading");
				const layers = await page
					.locator("[data-sheet-workspace-overlay-plane]")
					.evaluate((plane) => {
						const ownerWindow = plane.ownerDocument.defaultView;
						const eastPane = plane.ownerDocument.querySelector(
							'[data-sheet-workspace-pane="east"]',
						);
						return {
							cardIsPortaled: Boolean(
								plane.querySelector("[data-card-demo-overlay]"),
							),
							cardLayer: ownerWindow
								? Number.parseInt(
										ownerWindow.getComputedStyle(plane)
											.zIndex,
										10,
									)
								: Number.NaN,
							paneFeedbackLayer:
								ownerWindow && eastPane
									? Number.parseInt(
											ownerWindow.getComputedStyle(
												eastPane,
												"::after",
											).zIndex,
											10,
										)
									: Number.NaN,
						};
					});
				expect(layers.cardIsPortaled).toBe(true);
				expect(layers.cardLayer).toBeGreaterThan(
					layers.paneFeedbackLayer,
				);
			},
		);
	});
}

test("a dropped Note focuses its Close control and Enter removes it", async ({
	page,
}) => {
	await openResolutionCards(page, "Lorem");
	const west = pane(page, "west");

	await dragCardToPane(
		page,
		page.getByRole("button", {
			name: "Open Reading Note for Lorem",
			exact: true,
		}),
		west,
	);

	const close = west.getByRole("button", { name: "Close Note", exact: true });
	await expect(close).toBeFocused();
	await close.press("Enter");
	await expect(west.locator("[data-sheet-id]")).toHaveCount(0);
});

test("keyboard Card activation opens locally and Escape closes the Note", async ({
	page,
}) => {
	await openResolutionCards(page, "ipsum");
	await page
		.getByRole("button", {
			name: "Open Lemma Note for ipsum",
			exact: true,
		})
		.press("Enter");

	const central = pane(page, "central");
	await expect(central.locator("[data-sheet-id]")).toHaveCount(2);
	await page.keyboard.press("Escape");
	await expect(central.locator("[data-sheet-id]")).toHaveCount(1);
});

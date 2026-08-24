import { expect, type Locator, type Page, test } from "@playwright/test";

const workspacePath = "/playground/sheet-workspace/motion";

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
	beforeDrop?: () => Promise<void>,
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
	await beforeDrop?.();
	await page.mouse.up();
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

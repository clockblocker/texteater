import { expect, test } from "@playwright/test";

for (const edge of ["top", "bottom"] as const) {
	test(`Sheet lift follows the pointer at its ${edge} edge and cancels safely`, async ({
		page,
	}) => {
		await page.goto("/playground/sheet-workspace");
		const source = page.locator(
			'[data-workspace-pane="central"] [data-sheet-top="true"]',
		);
		const sourceId = await source.getAttribute("data-sheet-id");
		const handle = source.locator(`[data-sheet-handle="${edge}"]`);
		const box = await handle.boundingBox();
		if (!box) throw new Error("Missing Sheet handle");
		const pickup = {
			x: box.x + box.width * 0.2,
			y: box.y + box.height / 2,
		};
		await page.mouse.move(pickup.x, pickup.y);
		await page.mouse.down();
		const pointer = {
			x: pickup.x + 65,
			y: pickup.y + (edge === "top" ? 85 : -85),
		};
		await page.mouse.move(pointer.x, pointer.y, { steps: 8 });
		const card = page.locator(
			".card-sheet-workspace__drag-overlay > [data-sheet-drag-edge]",
		);
		await expect(card).toBeVisible();
		await expect
			.poll(async () => {
				const rect = await card.boundingBox();
				return rect
					? Math.abs(rect.x + rect.width / 2 - pointer.x)
					: Infinity;
			})
			.toBeLessThan(3);
		const rect = await card.boundingBox();
		if (!rect) throw new Error("Missing lifted Card");
		expect(rect.width).toBeLessThan(430);
		expect(rect.height).toBeGreaterThan(350);
		expect(
			Math.abs(
				(edge === "top" ? rect.y + 18.4 : rect.y + rect.height - 18.4) -
					pointer.y,
			),
		).toBeLessThan(3);
		await page.keyboard.press("Escape");
		await page.mouse.up();
		await expect(card).toHaveCount(0);
		await expect(
			page.locator(`[data-sheet-id="${sourceId}"]`),
		).toBeVisible();
	});
}

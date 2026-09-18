/// <reference lib="dom" />
import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

const enabled = process.env.VITE_TF_MOUSE_TRACE === "1";

async function downloadTrace(page: Page) {
	const downloadPromise = page.waitForEvent("download");
	await page
		.getByRole("button", { name: "Download JSON", exact: true })
		.click();
	const download = await downloadPromise;
	const path = await download.path();
	if (!path) throw new Error("Mouse trace download was not saved.");
	return JSON.parse(await readFile(path, "utf8"));
}

test("mouse recorder is absent without its development flag", async ({
	page,
}) => {
	test.skip(enabled, "Run without VITE_TF_MOUSE_TRACE to check the default.");
	await page.goto("/");
	await expect(
		page.getByRole("heading", { name: "Library", exact: true }),
	).toBeVisible();
	await expect(page.locator("[data-mouse-trace]")).toHaveCount(0);
});

test("mouse recorder exports real input, capture, cancellation, hover and markers", async ({
	page,
}) => {
	test.skip(
		!enabled,
		"Run VITE_TF_MOUSE_TRACE=1 bun run test:e2e mouse-trace.pw.ts.",
	);
	await page.goto("/");
	const heading = page.getByRole("heading", { name: "Library", exact: true });
	await expect(heading).toBeVisible();
	await expect(page.locator("[data-mouse-trace]")).toBeVisible();
	// Exercise browser capture and cancellation through real trusted mouse input.
	await heading.evaluate((element) => {
		element.addEventListener(
			"pointerdown",
			(event) => {
				if (!(event instanceof PointerEvent)) return;
				element.setPointerCapture(event.pointerId);
				event.preventDefault();
			},
			{ once: true },
		);
	});
	const box = await heading.boundingBox();
	if (!box) throw new Error("Missing Library heading.");
	await page.mouse.move(box.x + 10, box.y + 10);
	await page.mouse.down();
	await page.mouse.move(box.x + 10, box.y + 150, { steps: 3 });
	await page.mouse.up();
	await page.mouse.wheel(0, 20);
	await page.getByRole("button", { name: "Library", exact: true }).hover();
	await page.locator("[data-mouse-trace] summary").click();
	await page
		.getByRole("button", { name: "Mark freeze", exact: true })
		.click();
	const trace = await downloadTrace(page);
	expect(trace.version).toBe(1);
	expect(trace.droppedEntries).toBe(0);
	expect(trace.entries).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				type: "pointerdown",
				trusted: true,
				pointerType: "mouse",
				defaultPrevented: true,
			}),
			expect.objectContaining({ type: "pointerup", trusted: true }),
			expect.objectContaining({ type: "mousemove", trusted: true }),
			expect.objectContaining({ type: "gotpointercapture" }),
			expect.objectContaining({ type: "lostpointercapture" }),
			expect.objectContaining({ type: "wheel", deltaY: 20 }),
			expect.objectContaining({
				type: "hover-sample",
				ancestors: expect.arrayContaining([
					expect.objectContaining({ hover: true }),
				]),
			}),
			expect.objectContaining({ type: "marker", label: "hover freeze" }),
		]),
	);
	await page.getByRole("button", { name: "Pause", exact: true }).click();
	await page.mouse.click(box.x + 10, box.y + 10);
	const paused = await downloadTrace(page);
	expect(paused.entries.at(-1).type).toBe("pause");
	await page.getByRole("button", { name: "Resume", exact: true }).click();
	await page.getByRole("button", { name: "Clear", exact: true }).click();
	const cleared = await downloadTrace(page);
	expect(cleared.entries).toEqual([
		expect.objectContaining({ type: "clear" }),
	]);
});

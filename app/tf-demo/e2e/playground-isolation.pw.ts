import { expect, test } from "@playwright/test";

test("Notes fixtures render without querying or mutating the live dictionary", async ({
	page,
}) => {
	const frames: string[] = [];
	page.on("websocket", (socket) =>
		socket.on("framesent", (event) => frames.push(String(event.payload))),
	);
	await page.goto("/playground/notes");
	await page
		.getByRole("navigation", { name: "Fake db" })
		.locator("li")
		.filter({ hasText: "Interfix" })
		.getByRole("button", { name: "Reading", exact: true })
		.click();
	await expect(
		page.getByText("linking -s- in compounds", { exact: false }).first(),
	).toBeVisible();
	expect(frames.join("\n")).not.toMatch(
		/notesStudyFixtures|readingNotes:|routeNotes:|knowledgeGeneration:|readings-\d|lemmas-\d/,
	);
});

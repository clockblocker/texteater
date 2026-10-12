/// <reference lib="dom" />
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, type Locator, type Page, test } from "@playwright/test";

/*
 * A nested book on the Ground line (#1192): the Library lists it, a Section
 * opens its Codex with each entry's status, a pick steps one rung up, next
 * at a Scroll's end crosses Section boundaries, and ← steps back down the
 * line. The book is seeded with `libraryFixtures:seedNestedBook` on the
 * deployment `.env.local` selects (or TF_DEMO_E2E_CONVEX_ENV_FILE's); every
 * run's browser is a fresh Visitor, so its statuses start unread.
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));

function seedNestedBook(): void {
	const envFile = process.env.TF_DEMO_E2E_CONVEX_ENV_FILE;
	execFileSync(
		"bunx",
		[
			"convex",
			"run",
			...(envFile ? ["--env-file", envFile] : []),
			"libraryFixtures:seedNestedBook",
			"{}",
		],
		{
			cwd: appRoot,
			env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
			encoding: "utf8",
		},
	);
}

function frame(page: Page): Locator {
	return page.locator("[data-deck-frame]");
}

function rootedPane(page: Page): Locator {
	return frame(page).locator('[data-pane-kind="rooted"]');
}

function ground(page: Page): Locator {
	return frame(page).locator('[data-form="ground"][data-pane="pane-1"]');
}

function trail(page: Page): Locator {
	return rootedPane(page).getByRole("navigation", { name: "Trail" });
}

async function expectTrail(page: Page, rungs: readonly string[]) {
	await expect(trail(page)).toHaveText(
		new RegExp(
			rungs.map((rung) => rung.replace(/ /g, "\\s*")).join("\\s*›\\s*"),
		),
	);
}

function entry(page: Page, title: string): Locator {
	return ground(page)
		.locator("[data-codex-entry]")
		.filter({ hasText: new RegExp(`^${title}`) });
}

async function back(page: Page, to: string) {
	await rootedPane(page)
		.getByRole("button", { name: `Back to ${to}` })
		.click();
}

test.use({
	viewport: { width: 1280, height: 800 },
	contextOptions: { reducedMotion: "reduce" },
});

test("a nested book: Library, Codex, status, next across Sections, and back down the line", async ({
	page,
}, testInfo) => {
	test.setTimeout(60_000);
	seedNestedBook();

	await page.goto("/");
	await page.getByText("E2E fixtures", { exact: true }).click();
	await page
		.locator("[data-codex-entry='Section']")
		.filter({ hasText: "Die lange Reise" })
		.click();
	await expectTrail(page, ["Menu", "Library", "Die lange Reise"]);
	await expect(entry(page, "Teil 1")).toHaveAttribute(
		"data-status",
		"NotStarted",
	);
	await expect(ground(page).locator("[data-codex-entry]")).toHaveText([
		/^Teil 1/,
		/^Teil 2/,
		/^Nachwort/,
	]);
	await page.screenshot({ path: testInfo.outputPath("codex-book.png") });

	/* a pick steps one rung up the line */
	await entry(page, "Teil 1").click();
	await expectTrail(page, ["Menu", "Library", "Die lange Reise", "Teil 1"]);
	await entry(page, "Kapitel 2").click();
	await expectTrail(page, [
		"Menu",
		"Library",
		"Die lange Reise",
		"Teil 1",
		"Kapitel 2",
	]);
	const end = ground(page).locator('[data-slot="scroll-end"]');
	await expect(end).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("scroll-end.png") });

	/* next crosses out of Teil 1, into Teil 2 and down into Abschnitt A */
	await end.getByRole("button", { name: /^Next: Kapitel 3/ }).click();
	await expectTrail(page, [
		"Menu",
		"Library",
		"Die lange Reise",
		"Teil 2",
		"Abschnitt A",
		"Kapitel 3",
	]);
	await expect(
		ground(page).locator('[data-slot="text-reader"]'),
	).toContainText("Hinter dem Wald lag ein kleines Dorf.");

	/* back steps down one rung at a time, through the Sections next walked */
	await back(page, "Abschnitt A");
	await expect(entry(page, "Kapitel 3")).toHaveAttribute(
		"data-status",
		"InProgress",
	);
	await back(page, "Teil 2");
	await expect(entry(page, "Abschnitt A")).toHaveAttribute(
		"data-status",
		"InProgress",
	);
	await back(page, "Die lange Reise");
	await expect(entry(page, "Teil 2")).toHaveAttribute(
		"data-status",
		"InProgress",
	);
	await expect(
		ground(page).getByRole("button", { name: "Continue: Kapitel 3" }),
	).toBeVisible();

	/* Teil 1 is done once both its Scrolls are: next marked Kapitel 2 */
	await entry(page, "Teil 1").click();
	await expect(entry(page, "Kapitel 2")).toHaveAttribute(
		"data-status",
		"Done",
	);
	await entry(page, "Kapitel 1").click();
	const reader = ground(page).locator('[data-slot="text-reader"]');
	await expect(reader).toContainText("Am 24. Tag");
	await ground(page)
		.locator('[data-slot="scroll-end"]')
		.getByRole("button", { name: "Mark as done" })
		.click();
	await expect(
		ground(page)
			.locator('[data-slot="scroll-end"]')
			.getByRole("button", { name: "Done" }),
	).toHaveAttribute("aria-pressed", "true");
	await back(page, "Teil 1");
	await back(page, "Die lange Reise");
	await expect(entry(page, "Teil 1")).toHaveAttribute("data-status", "Done");
	await page.screenshot({ path: testInfo.outputPath("codex-status.png") });
});

test("a Scroll reopens where the reader left it", async ({ page }) => {
	test.setTimeout(60_000);
	seedNestedBook();

	await page.goto("/");
	await page.getByText("E2E fixtures", { exact: true }).click();
	await page
		.locator("[data-codex-entry='Section']")
		.filter({ hasText: "Die lange Reise" })
		.click();
	await entry(page, "Teil 1").click();
	await entry(page, "Kapitel 1").click();
	const sentence = ground(page)
		.locator("[data-sentence]")
		.filter({ hasText: "Am 16. Tag" });
	await sentence.scrollIntoViewIfNeeded();
	await sentence.evaluate((element) => {
		const scroller = element.closest<HTMLElement>("[data-scroller]");
		if (!scroller) throw new Error("The Sentence has no scroller.");
		scroller.scrollTop +=
			element.getBoundingClientRect().top -
			scroller.getBoundingClientRect().top -
			96;
	});
	/* the position settles before it is saved */
	await page.waitForTimeout(1_500);
	await back(page, "Teil 1");
	await entry(page, "Kapitel 1").click();
	await expect
		.poll(() =>
			sentence.evaluate((element) => {
				const scroller =
					element.closest<HTMLElement>("[data-scroller]");
				if (!scroller) return Number.NaN;
				return Math.round(
					element.getBoundingClientRect().top -
						scroller.getBoundingClientRect().top,
				);
			}),
		)
		.toBeLessThan(320);
});

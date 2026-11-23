import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceText = "והממשלה בשנת 2026.";
const submissionKey = "e2e:hebrew-reader-keyboard";

function seedText(): string {
	const segments = [
		{ kind: "ResolvableText", text: "ו" },
		{ kind: "ResolvableText", text: "ה" },
		{ kind: "ResolvableText", text: "ממשלה" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "בשנת" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "2026" },
		{ kind: "Punctuation", text: "." },
	];
	const output = execFileSync(
		process.execPath,
		[
			"../../node_modules/convex/bin/main.js",
			"run",
			"persistence:persistSubmittedText",
			JSON.stringify({
				submissionKey,
				sourceText,
				sentences: [
					{
						segmentedSentenceId: `${submissionKey}:0`,
						position: 0,
						paragraph: 0,
						language: "he",
						stitchedText: sourceText,
						segments,
						units: [
							{ segments: [0], route: "Unresolved" },
							{ segments: [1, 2], route: "Unresolved" },
							{ segments: [4], route: "Unresolved" },
							{ segments: [6], route: "Unresolved" },
						],
					},
				],
			}),
		],
		{
			cwd: appRoot,
			env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
			encoding: "utf8",
		},
	);
	const result = JSON.parse(output) as { textId?: string };
	if (!result.textId) throw Error("Hebrew reader fixture was not stored");
	return result.textId;
}

test("Library submits Hebrew as Hebrew and opens persisted clickable Segments", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await page.goto("/");
	await page.getByRole("button", { name: "Add a text" }).click();
	const language = page.getByRole("combobox", { name: "Text language" });
	await expect(language).toBeVisible();
	await language.selectOption("he");
	await page
		.getByRole("textbox", { name: "Hebrew text" })
		.fill("ראיתי את הממשלה בשנת 2026.");
	await page.getByRole("button", { name: "Analyze text" }).click();
	const reader = page.locator('[data-slot="text-reader"]');
	await expect(reader.locator("[data-sentence]")).toHaveAttribute(
		"lang",
		"he",
	);
	await expect(
		reader.getByRole("button", {
			name: "2026, Hebrew segmentation only; click selects its stored group",
		}),
	).toBeVisible();
});

test("Hebrew keyboard activation selects a stored group without resolving it", async ({
	page,
}) => {
	test.setTimeout(60_000);
	seedText();
	const sentFrames: string[] = [];
	page.on("websocket", (socket) =>
		socket.on("framesent", ({ payload }) =>
			sentFrames.push(String(payload)),
		),
	);
	await page.goto("/");
	await page.getByText("E2E fixtures", { exact: true }).click();
	await page
		.getByRole("button", { name: /^והממשלה בשנת 2026\./ })
		.first()
		.click();
	const reader = page.locator('[data-slot="text-reader"]');
	const sentence = reader.locator("[data-sentence]");
	await expect(sentence).toHaveAttribute("dir", "rtl");
	await expect(sentence).toHaveAttribute("lang", "he");
	const segment = (text: string) =>
		reader.getByRole("button", {
			name: `${text}, Hebrew segmentation only; click selects its stored group`,
			exact: true,
		});
	const article = segment("ה");
	const noun = segment("ממשלה");
	const conjunction = segment("ו");
	await expect(noun).toBeVisible();
	await article.focus();
	await expect(article).toHaveAttribute("data-state", "unknown-preview");
	await expect(noun).toHaveAttribute("data-state", "unknown-preview");
	await expect(conjunction).not.toHaveAttribute("data-state", /./);
	const beforeSelection = sentFrames.length;
	await page.keyboard.press("Enter");
	await expect(article).toHaveAttribute("aria-pressed", "true");
	await expect(noun).toHaveAttribute("aria-pressed", "true");
	await expect(conjunction).toHaveAttribute("aria-pressed", "false");
	await expect(article).toBeFocused();
	await expect(reader.locator('[data-form="card"]')).toHaveCount(0);
	expect(sentFrames.slice(beforeSelection).join("\n")).not.toContain(
		"resolutionSessions:selectSegment",
	);

	await page.setViewportSize({ width: 320, height: 700 });
	const rects = await Promise.all(
		[conjunction, article, noun].map((button) =>
			button.evaluate((element) => {
				const { top, left, width, height } =
					element.getBoundingClientRect();
				const hit = document.elementFromPoint(
					left + width / 2,
					top + height / 2,
				);
				return { top, hit: hit === element || element.contains(hit) };
			}),
		),
	);
	expect(rects.every(({ hit }) => hit)).toBe(true);
	expect(new Set(rects.map(({ top }) => top)).size).toBe(1);
});

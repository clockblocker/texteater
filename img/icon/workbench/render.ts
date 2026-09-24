/**
 * Render textfresser icon variants through Chromium, the way browsers show them.
 *
 *   bun img/icon/workbench/render.ts                every variant, plus out/sheet.png
 *   bun img/icon/workbench/render.ts <id> ...       only those variants, no sheet
 *   bun img/icon/workbench/render.ts 'zoo-*' ...    ids ending in * match by prefix
 *   ... --sheet=<name>                              also write out/<name>.png/.html
 *
 * For each variant, writes to out/:
 *   <id>.svg        the document
 *   <id>.png        640 px render
 *   <id>.sizes.png  256/128/64/32/16 px on light and dark, above the shipped icon
 *
 * Variants are the default exports of variants/*.ts (see Variant in kit.ts).
 */
import { mkdir, writeFile } from "node:fs/promises";

import { chromium, type Page } from "playwright";

import type { Variant } from "./kit";

const HERE = new URL(".", import.meta.url).pathname;
const OUT = `${HERE}out/`;
const SIZES = [256, 128, 64, 32, 16];
const SHEET_TILE = 300;
const SHEET_COLUMNS = 4;

type Rendered = { variant: Variant; svg: string };

async function loadVariants(): Promise<Variant[]> {
	const files = [
		...new Bun.Glob("variants/*.ts").scanSync({ cwd: HERE }),
	].sort();
	const variants: Variant[] = [];
	for (const file of files) {
		const module = (await import(`${HERE}${file}`)) as {
			default?: Variant;
		};
		if (!module.default)
			throw new Error(`${file} has no default Variant export`);
		variants.push(module.default);
	}
	const ids = new Set<string>();
	for (const { id } of variants) {
		if (ids.has(id)) throw new Error(`duplicate variant id "${id}"`);
		ids.add(id);
	}
	return variants.sort((a, b) =>
		a.id === "baseline"
			? -1
			: b.id === "baseline"
				? 1
				: a.id.localeCompare(b.id),
	);
}

function dataUrl(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function parseError(page: Page, svg: string): Promise<string | null> {
	return page.evaluate((source) => {
		const doc = new DOMParser().parseFromString(source, "image/svg+xml");
		return doc.querySelector("parsererror")?.textContent ?? null;
	}, svg);
}

async function shoot(page: Page, html: string, path: string): Promise<void> {
	await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
	await page.evaluate(() =>
		Promise.all([...document.images].map((image) => image.decode())),
	);
	await page.screenshot({ path, fullPage: true });
}

const RESET =
	"<style>*{margin:0;box-sizing:border-box}body{font:13px ui-monospace,monospace}</style>";

function sizesHtml(svg: string, baseline: string | undefined): string {
	const row = (source: string, background: string, label: string) =>
		`<div style="display:flex;align-items:flex-end;gap:16px;padding:16px;background:${background};color:${background === "#111" ? "#aaa" : "#555"}">${SIZES.map(
			(size) =>
				`<img src="${dataUrl(source)}" width="${size}" height="${size}" style="display:block">`,
		).join("")}<span>${label}</span></div>`;
	const rows = [row(svg, "#f2f2f2", "variant"), row(svg, "#111", "variant")];
	if (baseline)
		rows.push(
			row(baseline, "#f2f2f2", "shipped"),
			row(baseline, "#111", "shipped"),
		);
	return `${RESET}<div style="display:inline-block">${rows.join("")}</div>`;
}

function sheetHtml(
	rendered: Rendered[],
	source: (item: Rendered) => string,
): string {
	const tiles = rendered
		.map(
			(item) =>
				`<figure style="width:${SHEET_TILE}px"><img src="${source(item)}" width="${SHEET_TILE}" height="${SHEET_TILE}" style="display:block"><figcaption style="padding:6px 2px 0;color:#ccc"><b>${item.variant.id}</b> · ${(item.svg.length / 1024).toFixed(1)} KB<br><span style="color:#888">${item.variant.title}</span></figcaption></figure>`,
		)
		.join("");
	return `${RESET}<div style="display:inline-grid;grid-template-columns:repeat(${SHEET_COLUMNS},${SHEET_TILE}px);gap:20px;padding:20px;background:#111">${tiles}</div>`;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const sheetName =
		args
			.find((arg) => arg.startsWith("--sheet="))
			?.slice("--sheet=".length) ?? null;
	const requested = args.filter((arg) => !arg.startsWith("--"));
	const variants = await loadVariants();
	const matches = (pattern: string, id: string) =>
		pattern.endsWith("*")
			? id.startsWith(pattern.slice(0, -1))
			: id === pattern;
	const unknown = requested.filter(
		(pattern) => !variants.some(({ id }) => matches(pattern, id)),
	);
	if (unknown.length) {
		throw new Error(
			`unknown variant(s): ${unknown.join(", ")}; known: ${variants.map(({ id }) => id).join(", ")}`,
		);
	}
	const selected = requested.length
		? variants.filter(({ id }) =>
				requested.some((pattern) => matches(pattern, id)),
			)
		: variants;
	const sheet = sheetName ?? (requested.length ? null : "sheet");
	const baseline = variants.find(({ id }) => id === "baseline")?.render();

	await mkdir(OUT, { recursive: true });
	const browser = await chromium.launch();
	const page = await browser.newPage({
		viewport: { width: 640, height: 640 },
	});
	const rendered: Rendered[] = [];
	let failed = false;

	for (const variant of selected) {
		const svg = variant.render();
		const problems: string[] = [];
		const error = await parseError(page, svg);
		if (error) problems.push(`invalid SVG: ${error.split("\n")[0]}`);
		if (variant.render() !== svg)
			problems.push("render() is not deterministic; seed kit.rng");
		if (problems.length) {
			failed = true;
			console.error(`✗ ${variant.id}: ${problems.join("; ")}`);
			continue;
		}

		await writeFile(`${OUT}${variant.id}.svg`, svg);
		await shoot(
			page,
			`${RESET}<img src="${dataUrl(svg)}" width="640" height="640" style="display:block">`,
			`${OUT}${variant.id}.png`,
		);
		await shoot(
			page,
			sizesHtml(svg, variant.id === "baseline" ? undefined : baseline),
			`${OUT}${variant.id}.sizes.png`,
		);
		rendered.push({ variant, svg });
		console.log(
			`✓ ${variant.id.padEnd(24)} ${(svg.length / 1024).toFixed(1).padStart(6)} KB  out/${variant.id}.png`,
		);
	}

	if (sheet && rendered.length) {
		await page.setViewportSize({ width: 800, height: 600 });
		await shoot(
			page,
			sheetHtml(rendered, (item) => dataUrl(item.svg)),
			`${OUT}${sheet}.png`,
		);
		await writeFile(
			`${OUT}${sheet}.html`,
			sheetHtml(rendered, (item) => `${item.variant.id}.svg`),
		);
		console.log(`✓ out/${sheet}.png, out/${sheet}.html`);
	}

	await browser.close();
	if (failed) process.exit(1);
}

await main();

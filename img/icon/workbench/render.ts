/**
 * Render textfresser icon variants through Chromium, the way browsers show them.
 *
 *   bun img/icon/workbench/render.ts                every variant, plus out/sheet.png
 *   bun img/icon/workbench/render.ts <id> ...       only variants/<id>.ts, no sheet
 *   bun img/icon/workbench/render.ts 'zoo-*' ...    ids ending in * match by prefix
 *   ... --sheet=<name>                              also write out/<name>.png/.html
 *
 * For each variant, writes to out/:
 *   <id>.svg          the document
 *   <id>.png          640 px render
 *   <id>.sizes.png    256/128/64/32/16 px on light and dark, above the shipped icon
 *   <id>.frames.png   animated variants only: a filmstrip across `animation`
 *   blind/<code>.png, blind/<code>.sizes.png
 *                     the same renders under a code name (printed per variant)
 *                     and without the shipped icon, for critics who must not
 *                     be told what the variant shows
 *
 * An animated variant's stills (png, sizes, sheet) show its last frame.
 *
 * Variants are the default exports of variants/*.ts (see Variant in kit.ts).
 */
import { mkdir, writeFile } from "node:fs/promises";

import { chromium, type Page } from "playwright";

import type { Variant } from "./kit";

const HERE = new URL(".", import.meta.url).pathname;
const OUT = `${HERE}out/`;
const SIZE = 640;
const SIZES = [256, 128, 64, 32, 16];
const SHEET_TILE = 300;
const SHEET_COLUMNS = 4;
const SHEET_SMALL = [64, 32, 16];
const FRAME_TILE = 200;

type Rendered = { variant: Variant; svg: string; still: string };

/**
 * Imports variants/<id>.ts for every id matching `patterns` (all when
 * empty), plus the baseline. A file that fails to load is reported and
 * skipped, so a variant being edited elsewhere cannot break this run.
 */
async function loadVariants(
	patterns: readonly string[],
): Promise<{ variants: Variant[]; broken: string[] }> {
	const matches = (id: string) =>
		!patterns.length ||
		id === "baseline" ||
		patterns.some((pattern) =>
			pattern.endsWith("*")
				? id.startsWith(pattern.slice(0, -1))
				: id === pattern,
		);
	const ids = [...new Bun.Glob("variants/*.ts").scanSync({ cwd: HERE })]
		.map((file) => file.slice("variants/".length, -".ts".length))
		.filter(matches)
		.sort((a, b) =>
			a === "baseline" ? -1 : b === "baseline" ? 1 : a.localeCompare(b),
		);
	const unknown = patterns.filter(
		(pattern) =>
			!ids.some((id) =>
				pattern.endsWith("*")
					? id.startsWith(pattern.slice(0, -1))
					: id === pattern,
			),
	);
	if (unknown.length)
		throw new Error(`no variants/<id>.ts for: ${unknown.join(", ")}`);
	const variants: Variant[] = [];
	const broken: string[] = [];
	for (const id of ids) {
		try {
			const module = (await import(`${HERE}variants/${id}.ts`)) as {
				default?: Variant;
			};
			if (!module.default) throw new Error("no default Variant export");
			if (module.default.id !== id)
				throw new Error(
					`exports id "${module.default.id}"; must match its file name`,
				);
			variants.push(module.default);
		} catch (error) {
			broken.push(id);
			console.error(
				`✗ ${id}: ${error instanceof Error ? error.message : error}`,
			);
		}
	}
	return { variants, broken };
}

/** Stable, meaningless name for a variant id (FNV-1a, base 36). */
function blindCode(id: string): string {
	let hash = 0x811c9dc5;
	for (const character of id) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return `v${hash.toString(36).padStart(7, "0")}`;
}

function svgUrl(svg: string): string {
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function pngUrl(png: Buffer): string {
	return `data:image/png;base64,${png.toString("base64")}`;
}

async function parseError(page: Page, svg: string): Promise<string | null> {
	return page.evaluate((source) => {
		const doc = new DOMParser().parseFromString(source, "image/svg+xml");
		return doc.querySelector("parsererror")?.textContent ?? null;
	}, svg);
}

const RESET =
	"<style>*{margin:0;box-sizing:border-box}body{font:13px ui-monospace,monospace}</style>";

/** Screenshots the first element of `html`, cropped to it. */
async function shoot(page: Page, html: string, path?: string): Promise<Buffer> {
	await page.setContent(
		`<!doctype html><html><body>${RESET}${html}</body></html>`,
	);
	await page.evaluate(() =>
		Promise.all([...document.images].map((image) => image.decode())),
	);
	return page.locator("body > :not(style)").first().screenshot({ path });
}

/**
 * The SVG inline at `size` px, SMIL and CSS animations paused at `at`
 * seconds.
 */
async function still(
	page: Page,
	svg: string,
	at: number,
	size: number,
): Promise<Buffer> {
	await page.setContent(
		`<!doctype html><html><body style="margin:0">${svg.replace("<svg ", `<svg style="display:block;width:${size}px;height:${size}px" `)}</body></html>`,
	);
	await page.evaluate((time) => {
		const root = document.querySelector("svg") as SVGSVGElement;
		root.pauseAnimations();
		root.setCurrentTime(time);
		for (const animation of root.getAnimations({ subtree: true })) {
			animation.pause();
			animation.currentTime = time * 1000;
		}
	}, at);
	return page.locator("svg").first().screenshot();
}

function framesHtml(shots: { time: number; png: Buffer }[]): string {
	return `<div style="display:inline-flex;flex-wrap:wrap;gap:8px;padding:12px;background:#111;width:${(FRAME_TILE + 8) * 5 + 16}px">${shots
		.map(
			({ time, png }) =>
				`<figure><img src="${pngUrl(png)}" width="${FRAME_TILE}" height="${FRAME_TILE}" style="display:block"><figcaption style="color:#aaa;padding-top:4px">${time.toFixed(2)} s</figcaption></figure>`,
		)
		.join("")}</div>`;
}

function sizesHtml(source: string, baseline: string | undefined): string {
	const row = (image: string, background: string, label: string) =>
		`<div style="display:flex;align-items:flex-end;gap:16px;padding:16px;background:${background};color:${background === "#111" ? "#aaa" : "#555"}">${SIZES.map(
			(size) =>
				`<img src="${image}" width="${size}" height="${size}" style="display:block">`,
		).join("")}<span>${label}</span></div>`;
	const rows = [
		row(source, "#f2f2f2", "variant"),
		row(source, "#111", "variant"),
	];
	if (baseline)
		rows.push(
			row(baseline, "#f2f2f2", "shipped"),
			row(baseline, "#111", "shipped"),
		);
	return `<div style="display:inline-block">${rows.join("")}</div>`;
}

function sheetHtml(
	rendered: Rendered[],
	source: (item: Rendered) => string,
): string {
	const small = (item: Rendered, background: string) =>
		`<div style="display:flex;align-items:flex-end;gap:10px;padding:8px;background:${background}">${SHEET_SMALL.map(
			(size) =>
				`<img src="${source(item)}" width="${size}" height="${size}" style="display:block">`,
		).join("")}</div>`;
	const tiles = rendered
		.map(
			(item) =>
				`<figure style="width:${SHEET_TILE}px"><img src="${source(item)}" width="${SHEET_TILE}" height="${SHEET_TILE}" style="display:block"><div style="display:flex">${small(item, "#f2f2f2")}${small(item, "#000")}</div><figcaption style="padding:6px 2px 0;color:#ccc"><b>${item.variant.id}</b> · ${(item.svg.length / 1024).toFixed(1)} KB<br><span style="color:#888">${item.variant.title}</span></figcaption></figure>`,
		)
		.join("");
	return `<div style="display:inline-grid;grid-template-columns:repeat(${SHEET_COLUMNS},${SHEET_TILE}px);gap:20px;padding:20px;background:#111">${tiles}</div>`;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const sheetName =
		args
			.find((arg) => arg.startsWith("--sheet="))
			?.slice("--sheet=".length) ?? null;
	const requested = args.filter((arg) => !arg.startsWith("--"));
	const { variants, broken } = await loadVariants(requested);
	const selected = requested.length
		? variants.filter(
				({ id }) => id !== "baseline" || requested.includes("baseline"),
			)
		: variants;
	const sheet = sheetName ?? (requested.length ? null : "sheet");
	const baseline = variants.find(({ id }) => id === "baseline")?.render();

	await mkdir(`${OUT}blind/`, { recursive: true });
	const browser = await chromium.launch();
	const page = await browser.newPage({
		viewport: { width: SIZE, height: SIZE },
	});
	const rendered: Rendered[] = [];
	let failed = broken.length > 0;

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

		const code = blindCode(variant.id);
		const notes: string[] = [];
		await writeFile(`${OUT}${variant.id}.svg`, svg);
		let png: Buffer;
		let source = svgUrl(svg);
		if (variant.animation) {
			const { seconds, frames = 10 } = variant.animation;
			png = await still(page, svg, seconds, SIZE);
			source = pngUrl(png);
			const shots = [];
			for (let index = 0; index < frames; index++) {
				const time =
					frames === 1 ? 0 : (seconds * index) / (frames - 1);
				shots.push({
					time,
					png: await still(page, svg, time, FRAME_TILE),
				});
			}
			await shoot(
				page,
				framesHtml(shots),
				`${OUT}${variant.id}.frames.png`,
			);
			notes.push(`out/${variant.id}.frames.png`);
		} else {
			png = await shoot(
				page,
				`<img src="${source}" width="${SIZE}" height="${SIZE}" style="display:block">`,
			);
		}
		await writeFile(`${OUT}${variant.id}.png`, png);
		await writeFile(`${OUT}blind/${code}.png`, png);
		await shoot(
			page,
			sizesHtml(
				source,
				variant.id === "baseline"
					? undefined
					: baseline && svgUrl(baseline),
			),
			`${OUT}${variant.id}.sizes.png`,
		);
		await shoot(
			page,
			sizesHtml(source, undefined),
			`${OUT}blind/${code}.sizes.png`,
		);
		rendered.push({ variant, svg, still: source });
		console.log(
			`✓ ${variant.id.padEnd(24)} ${(svg.length / 1024).toFixed(1).padStart(6)} KB  out/${variant.id}.png  ${[...notes, `blind/${code}`].join("  ")}`,
		);
	}

	if (sheet && rendered.length) {
		await page.setViewportSize({ width: 800, height: 600 });
		await shoot(
			page,
			sheetHtml(rendered, (item) => item.still),
			`${OUT}${sheet}.png`,
		);
		await writeFile(
			`${OUT}${sheet}.html`,
			`${RESET}${sheetHtml(rendered, (item) => `${item.variant.id}.svg`)}`,
		);
		console.log(`✓ out/${sheet}.png, out/${sheet}.html`);
	}

	await browser.close();
	if (failed) process.exit(1);
}

await main();

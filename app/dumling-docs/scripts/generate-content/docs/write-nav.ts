import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listMarkdownFiles, removeEmptyDirectories } from "../shared/fs";
import { generatedDocsDir, publicDir } from "../shared/paths";
import { parseFrontmatter } from "./frontmatter";
import {
	generatedRouteIdForPath,
	publicHrefForRouteId,
	publicMarkdownPathForRouteId,
} from "./routes";

export function writeNavFiles(): void {
	const navItems = listMarkdownFiles(generatedDocsDir)
		.map((generatedPath) => {
			const { frontmatter } = parseFrontmatter(
				readFileSync(generatedPath, "utf8"),
				generatedPath,
			);
			const routeId = generatedRouteIdForPath(generatedPath);

			return {
				frontmatter,
				routeId,
			};
		})
		.toSorted((left, right) => {
			const orderDelta = left.frontmatter.order - right.frontmatter.order;
			if (orderDelta !== 0) {
				return orderDelta;
			}
			return left.frontmatter.title.localeCompare(
				right.frontmatter.title,
			);
		})
		.map((page) => ({
			href: publicHrefForRouteId(page.routeId),
			mdHref:
				page.routeId === "index" ? "/index.md" : `/${page.routeId}.md`,
			routeId: page.frontmatter.routeId ?? page.routeId,
			title: page.frontmatter.navTitle ?? page.frontmatter.title,
		}));

	mkdirSync(publicDir, { recursive: true });
	writeFileSync(
		join(publicDir, "nav.json"),
		`${JSON.stringify(navItems, null, 2)}\n`,
	);
	writeFileSync(
		join(publicDir, "nav.md"),
		`${navItems
			.map(
				(item) =>
					`- [${item.title}](${item.href}) ([md](${item.mdHref}))`,
			)
			.join("\n")}\n`,
	);
}

export function removeGeneratedDocOutputs(): void {
	for (const generatedPath of listMarkdownFiles(generatedDocsDir)) {
		const routeId = generatedRouteIdForPath(generatedPath);
		rmSync(generatedPath, { force: true });
		rmSync(publicMarkdownPathForRouteId(routeId), { force: true });
	}

	for (const navPath of [
		join(publicDir, "nav.json"),
		join(publicDir, "nav.md"),
	]) {
		rmSync(navPath, { force: true });
	}

	removeEmptyDirectories(generatedDocsDir);
	removeEmptyDirectories(publicDir);
}

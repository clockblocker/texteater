import type { Frontmatter } from "../shared/types";

export interface DocPageMeta {
	description?: string;
	navTitle?: string;
	order?: number;
	slug?: string;
	title: string;
}

function assertNonEmptyString(
	value: unknown,
	fieldName: string,
	sourcePath: string,
): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${sourcePath} is missing ${fieldName}.`);
	}
	return value.trim();
}

export function slugifyDocTitle(title: string): string {
	const slug = title
		.normalize("NFKD")
		.replace(/\p{Diacritic}+/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/^-+|-+$/gu, "");
	if (slug.length === 0) {
		throw new Error(`Could not derive a slug from title "${title}".`);
	}
	return slug;
}

export function canonicalSlugForDocMeta(
	meta: DocPageMeta,
	sourcePath: string,
): string {
	const explicitSlug =
		typeof meta.slug === "string" && meta.slug.trim().length > 0
			? meta.slug.trim()
			: undefined;
	const slug = explicitSlug ?? slugifyDocTitle(meta.title);

	if (!/^[a-z0-9-]+$/u.test(slug)) {
		throw new Error(
			`${sourcePath} has an invalid slug "${slug}". Use lowercase letters, numbers, and hyphens only.`,
		);
	}
	if (slug === "index") {
		throw new Error(
			`${sourcePath} resolves to slug "index", but typed index pages are not supported.`,
		);
	}

	return slug;
}

export function frontmatterForDocMeta(meta: DocPageMeta): Frontmatter {
	return {
		description:
			typeof meta.description === "string" &&
			meta.description.trim().length > 0
				? meta.description.trim()
				: undefined,
		navTitle:
			typeof meta.navTitle === "string" && meta.navTitle.trim().length > 0
				? meta.navTitle.trim()
				: undefined,
		order:
			typeof meta.order === "number" && Number.isFinite(meta.order)
				? meta.order
				: 0,
		title: meta.title,
	};
}

export function parseDocPageMeta(
	value: unknown,
	sourcePath: string,
): DocPageMeta {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${sourcePath} must export a meta object.`);
	}

	const meta = value as Record<string, unknown>;
	const title = assertNonEmptyString(meta.title, "meta.title", sourcePath);
	const description =
		typeof meta.description === "string" &&
		meta.description.trim().length > 0
			? meta.description.trim()
			: undefined;
	const navTitle =
		typeof meta.navTitle === "string" && meta.navTitle.trim().length > 0
			? meta.navTitle.trim()
			: undefined;
	const slug =
		typeof meta.slug === "string" && meta.slug.trim().length > 0
			? meta.slug.trim()
			: undefined;
	const order =
		typeof meta.order === "number" && Number.isFinite(meta.order)
			? meta.order
			: undefined;

	return {
		description,
		navTitle,
		order,
		slug,
		title,
	};
}

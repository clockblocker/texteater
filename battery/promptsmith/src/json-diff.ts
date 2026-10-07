import { isRecord } from "common-utils";

/** One differing JSON location. An absent side means the value is missing there. */
export type JsonChange = {
	/** `units[2].route.kind`; the empty string is the root value. */
	readonly path: string;
	readonly change: "Added" | "Removed" | "Changed";
	readonly left?: unknown;
	readonly right?: unknown;
};

/**
 * Structural JSON diff. Arrays compare by index, objects by key, and anything
 * else by value. A key whose value is undefined counts as absent, as in JSON.
 */
export function diffJson(left: unknown, right: unknown): JsonChange[] {
	const changes: JsonChange[] = [];
	visit(left, right, "", changes);
	return changes;
}

function keyPath(path: string, key: string): string {
	if (!/^[A-Za-z_$][\w$]*$/.test(key))
		return `${path}[${JSON.stringify(key)}]`;
	return path ? `${path}.${key}` : key;
}

function visit(
	left: unknown,
	right: unknown,
	path: string,
	changes: JsonChange[],
): void {
	if (left === undefined && right === undefined) return;
	if (left === undefined) {
		changes.push({ path, change: "Added", right });
		return;
	}
	if (right === undefined) {
		changes.push({ path, change: "Removed", left });
		return;
	}
	if (Array.isArray(left) && Array.isArray(right)) {
		for (
			let index = 0;
			index < Math.max(left.length, right.length);
			index++
		)
			visit(left[index], right[index], `${path}[${index}]`, changes);
		return;
	}
	if (isRecord(left) && isRecord(right)) {
		const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
		for (const key of keys)
			visit(left[key], right[key], keyPath(path, key), changes);
		return;
	}
	if (
		Array.isArray(left) ||
		Array.isArray(right) ||
		isRecord(left) ||
		isRecord(right) ||
		left !== right
	)
		changes.push({ path, change: "Changed", left, right });
}

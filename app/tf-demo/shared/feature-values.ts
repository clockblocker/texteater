/**
 * A feature value as short text, the same in Notes and in the backend's
 * projections: `Dat`, a set `Masc/Neut`, or a noun's `mixed` gender
 * `Masc/Neut`. Undefined for no value.
 */
export function featureValueText(value: unknown): string | undefined {
	if (value == null) return undefined;
	const members =
		typeof value === "object" && "mixed" in value ? value.mixed : value;
	if (Array.isArray(members))
		return members.length === 0 ? undefined : members.map(String).join("/");
	if (typeof members === "boolean") return members ? "yes" : undefined;
	return String(members);
}

export function encodeBase64Url(value: string) {
	return Buffer.from(value, "utf8")
		.toString("base64")
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/u, "");
}

export function decodeBase64Url(value: string) {
	if (!/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) {
		throw new Error("Invalid base64url payload");
	}

	const padded = `${value}${"=".repeat((4 - (value.length % 4 || 4)) % 4)}`
		.replaceAll("-", "+")
		.replaceAll("_", "/");
	return Buffer.from(padded, "base64").toString("utf8");
}

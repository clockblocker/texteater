/**
 * The app type-checks react-resizable-panels' vendored source, which types a
 * timer as `NodeJS.Timeout`, with browser types only.
 */
declare namespace NodeJS {
	type Timeout = ReturnType<typeof setTimeout>;
}

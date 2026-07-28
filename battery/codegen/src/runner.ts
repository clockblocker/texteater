import { createHash } from "node:crypto";
import type { Dirent, Stats } from "node:fs";
import {
	lstat,
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import {
	basename,
	dirname,
	isAbsolute,
	posix,
	relative,
	resolve,
	sep,
	win32,
} from "node:path";
import {
	CodegenConfigurationError,
	CodegenInputError,
	CodegenOwnershipError,
	CodegenPlanError,
} from "./errors.js";
import {
	type ArtifactDraft,
	type CodegenRecipe,
	type CodegenRun,
	type Input,
	type Inputs,
	type MaterializedInputs,
	type Output,
	type Outputs,
	type PlannedArtifact,
	type PlannedChange,
	type Provenance,
	type RunOptions,
	recipeDefinition,
	type TextSource,
} from "./types.js";

export interface CodegenFileSystem {
	assertSafePath(root: string, path: string): Promise<void>;
	listFiles(root: string, recursive: boolean): Promise<readonly string[]>;
	read(path: string): Promise<Uint8Array | undefined>;
	remove(path: string): Promise<void>;
	write(path: string, content: Uint8Array): Promise<void>;
}

let temporaryFileCounter = 0;

export const nodeFileSystem: CodegenFileSystem = {
	async assertSafePath(root, path) {
		const absoluteRoot = resolve(root);
		const absolutePath = resolve(path);
		if (!isWithin(absoluteRoot, absolutePath)) {
			throw new CodegenPlanError(
				`Path "${absolutePath}" escapes filesystem boundary "${absoluteRoot}".`,
			);
		}

		const segments = relative(absoluteRoot, absolutePath)
			.split(sep)
			.filter((segment) => segment.length > 0);
		let current = absoluteRoot;
		for (const [index, segment] of segments.entries()) {
			current = resolve(current, segment);
			let stats: Stats;
			try {
				stats = await lstat(current);
			} catch (error) {
				if (errorCode(error) === "ENOENT") {
					return;
				}
				throw new CodegenPlanError(
					`Cannot inspect output path "${current}": ${errorMessage(error)}`,
				);
			}
			if (stats.isSymbolicLink()) {
				throw new CodegenPlanError(
					`Output path "${absolutePath}" traverses symbolic link "${current}".`,
				);
			}
			if (index < segments.length - 1 && !stats.isDirectory()) {
				throw new CodegenPlanError(
					`Output path "${absolutePath}" traverses non-directory "${current}".`,
				);
			}
		}
	},
	async listFiles(root, recursive) {
		const files: string[] = [];

		async function visit(directory: string): Promise<void> {
			let entries: Dirent[];
			try {
				entries = await readdir(directory, { withFileTypes: true });
			} catch (error) {
				throw new CodegenInputError(
					`Cannot discover input directory "${directory}": ${errorMessage(error)}`,
				);
			}

			for (const entry of entries) {
				const path = resolve(directory, entry.name);
				if (entry.isFile()) {
					files.push(path);
				} else if (recursive && entry.isDirectory()) {
					await visit(path);
				}
			}
		}

		await visit(root);
		return files;
	},
	async read(path) {
		try {
			return await readFile(path);
		} catch (error) {
			if (errorCode(error) === "ENOENT") {
				return undefined;
			}
			throw error;
		}
	},
	async remove(path) {
		await rm(path, { force: true });
	},
	async write(path, content) {
		await mkdir(dirname(path), { recursive: true });
		const temporaryPath = resolve(
			dirname(path),
			`.${basename(path)}.dumcodegen-${process.pid}-${temporaryFileCounter++}.tmp`,
		);
		try {
			await writeFile(temporaryPath, content, { flag: "wx" });
			await rename(temporaryPath, path);
		} catch (error) {
			await rm(temporaryPath, { force: true }).catch(() => undefined);
			throw error;
		}
	},
};

type OutputContext = Readonly<{
	key: string;
	root: string;
	specification: Output;
}>;

type ManifestState = Readonly<{
	boundary: string;
	content: Uint8Array;
	destination: string;
	path: string;
	previousFiles: readonly string[];
	root: string;
	target: string;
}>;

type ManifestDescriptor = Readonly<{
	boundary: string;
	destination: string;
	path: string;
	root: string;
	target: string;
}>;

type ExecutionPlan<Metadata> = Readonly<{
	artifacts: readonly PlannedArtifact<string, Metadata>[];
	changes: readonly PlannedChange[];
	contents: ReadonlyMap<string, Uint8Array>;
}>;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export async function runCodegen<I extends Inputs, O extends Outputs, Metadata>(
	recipe: CodegenRecipe<I, O, Metadata>,
	options: RunOptions,
): Promise<CodegenRun<Metadata>> {
	return runCodegenWithFileSystem(recipe, options, nodeFileSystem);
}

export async function runCodegenWithFileSystem<
	I extends Inputs,
	O extends Outputs,
	Metadata,
>(
	recipe: CodegenRecipe<I, O, Metadata>,
	options: RunOptions,
	fileSystem: CodegenFileSystem,
): Promise<CodegenRun<Metadata>> {
	if (options.mode !== "check" && options.mode !== "write") {
		throw new CodegenConfigurationError(
			`Unknown codegen mode "${String(options.mode)}".`,
		);
	}

	const definition = recipe[recipeDefinition];
	if (definition === undefined) {
		throw new CodegenConfigurationError(
			"The supplied value is not a codegen recipe.",
		);
	}

	const outputs = prepareOutputs(definition.outputs);
	validateManifestDestinations(outputs);
	const inputs = await materializeInputs(definition.inputs, fileSystem);
	const primaryDrafts = await definition.build(inputs);
	const primary = planArtifacts(primaryDrafts, outputs);
	validateArtifactSet(primary);
	const aggregateDrafts = definition.aggregate
		? await definition.aggregate(primary)
		: [];
	const aggregate = planArtifacts(aggregateDrafts, outputs);
	const artifacts = freezeArray([...primary, ...aggregate]);
	validateArtifactSet(artifacts);
	validateArtifactReferences(artifacts);
	validateArtifactManifestCollisions(artifacts, outputs);

	const plan = await inspectFileSystem(artifacts, outputs, fileSystem);
	const changed = plan.changes.some((change) => change.kind !== "unchanged");
	const applied: PlannedChange[] = [];

	if (options.mode === "write") {
		for (const change of plan.changes) {
			if (change.kind === "unchanged" || change.subject === "manifest") {
				continue;
			}
			await assertChangePathIsSafe(change, outputs, fileSystem);
			if (change.kind === "delete") {
				await fileSystem.remove(change.destination);
			} else {
				const content = plan.contents.get(change.destination);
				if (content === undefined) {
					throw new CodegenPlanError(
						`No planned content for "${change.destination}".`,
					);
				}
				await fileSystem.write(change.destination, content);
			}
			applied.push(change);
		}

		// Ownership is committed last: an interrupted artifact write never records
		// files as successfully owned before their mutations have completed.
		for (const change of plan.changes) {
			if (change.subject !== "manifest" || change.kind === "unchanged") {
				continue;
			}
			await assertChangePathIsSafe(change, outputs, fileSystem);
			const content = plan.contents.get(change.destination);
			if (content === undefined) {
				throw new CodegenPlanError(
					`No planned manifest content for "${change.destination}".`,
				);
			}
			await fileSystem.write(change.destination, content);
			applied.push(change);
		}
	}

	return deepFreeze({
		mode: options.mode,
		status: changed ? "changed" : "clean",
		plan: {
			artifacts,
			changes: plan.changes,
		},
		applied: freezeArray(applied),
	});
}

function prepareOutputs(outputs: Outputs): ReadonlyMap<string, OutputContext> {
	const result = new Map<string, OutputContext>();

	for (const key of Object.keys(outputs).toSorted()) {
		const specification = outputs[key];
		if (specification === undefined) {
			continue;
		}
		if (specification.root.length === 0) {
			throw new CodegenConfigurationError(
				`Output "${key}" has an empty root.`,
			);
		}
		const root = resolve(specification.root);
		validateConfiguredAbsolutePath(root, `root for output "${key}"`);
		result.set(
			key,
			Object.freeze({
				key,
				root,
				specification,
			}),
		);
	}

	if (result.size === 0) {
		throw new CodegenConfigurationError(
			"A codegen recipe must define at least one output.",
		);
	}
	return result;
}

function validateManifestDestinations(
	outputs: ReadonlyMap<string, OutputContext>,
): void {
	const manifests: ManifestDescriptor[] = [];
	for (const output of outputs.values()) {
		const manifest = manifestDescriptor(output);
		if (manifest === undefined) {
			continue;
		}
		manifests.push(manifest);
	}

	for (const [index, manifest] of manifests.entries()) {
		for (const other of manifests.slice(index + 1)) {
			if (!pathsConflict(manifest.destination, other.destination)) {
				continue;
			}
			throw new CodegenConfigurationError(
				`Ownership manifests for outputs "${manifest.target}" and "${other.target}" have conflicting paths "${manifest.destination}" and "${other.destination}".`,
			);
		}
	}
}

async function materializeInputs<I extends Inputs>(
	inputs: I,
	fileSystem: CodegenFileSystem,
): Promise<Readonly<MaterializedInputs<I>>> {
	const materialized: Record<string, TextSource | readonly TextSource[]> = {};
	for (const key of Object.keys(inputs).toSorted()) {
		const input = inputs[key];
		if (input === undefined) {
			continue;
		}
		materialized[key] = await materializeInput(input, fileSystem);
	}
	return deepFreeze(materialized) as Readonly<MaterializedInputs<I>>;
}

async function materializeInput(
	input: Input,
	fileSystem: CodegenFileSystem,
): Promise<TextSource | readonly TextSource[]> {
	if (input.kind === "text") {
		const path = resolve(input.path);
		return readTextSource(path, fileSystem);
	}

	if (input.include.length === 0) {
		throw new CodegenConfigurationError(
			`Text-set input "${input.root}" must include at least one glob.`,
		);
	}

	const root = resolve(input.root);
	const recursive = input.recursive ?? false;
	const candidates = await fileSystem.listFiles(root, recursive);
	const include = input.include.map(globToRegExp);
	const exclude = (input.exclude ?? []).map(globToRegExp);
	const paths = candidates
		.map((path) => ({
			absolute: resolve(path),
			relative: portablePath(relative(root, resolve(path))),
		}))
		.filter(
			(candidate) =>
				isWithin(root, candidate.absolute) &&
				include.some((pattern) => pattern.test(candidate.relative)) &&
				!exclude.some((pattern) => pattern.test(candidate.relative)),
		)
		.toSorted((left, right) =>
			compareCodeUnits(left.relative, right.relative),
		);

	return freezeArray(
		await Promise.all(
			paths.map((candidate) =>
				readTextSource(candidate.absolute, fileSystem),
			),
		),
	);
}

async function readTextSource(
	path: string,
	fileSystem: CodegenFileSystem,
): Promise<TextSource> {
	let content: Uint8Array | undefined;
	try {
		content = await fileSystem.read(path);
	} catch (error) {
		throw new CodegenInputError(
			`Cannot read input "${path}": ${errorMessage(error)}`,
		);
	}
	if (content === undefined) {
		throw new CodegenInputError(`Input "${path}" does not exist.`);
	}
	try {
		return deepFreeze({
			source: { kind: "source" as const, path },
			text: decoder.decode(content),
		});
	} catch (error) {
		throw new CodegenInputError(
			`Input "${path}" is not valid UTF-8: ${errorMessage(error)}`,
		);
	}
}

function planArtifacts<Target extends string, Metadata>(
	drafts: readonly ArtifactDraft<Target, Metadata>[],
	outputs: ReadonlyMap<string, OutputContext>,
): readonly PlannedArtifact<Target, Metadata>[] {
	if (!Array.isArray(drafts)) {
		throw new CodegenPlanError(
			"A codegen build callback must return an array of artifacts.",
		);
	}

	return freezeArray(
		drafts.map((draft, index) => {
			if (typeof draft.id !== "string" || draft.id.trim().length === 0) {
				throw new CodegenPlanError(
					`Artifact at index ${index} has an invalid id.`,
				);
			}
			const output = outputs.get(draft.to.target);
			if (output === undefined) {
				throw new CodegenPlanError(
					`Artifact "${draft.id}" targets unknown output "${draft.to.target}".`,
				);
			}
			const path = validateRelativePath(
				draft.to.path,
				`path for artifact "${draft.id}"`,
			);
			const provenance = validateProvenance(draft.provenance, draft.id);
			const content =
				typeof draft.content === "string"
					? encoder.encode(draft.content)
					: new Uint8Array(draft.content);
			const metadata = cloneMetadata(draft.meta, draft.id);
			const to = Object.freeze({
				target: draft.to.target,
				path,
			});
			const destination = destinationWithin(output.root, path);
			const digest = createHash("sha256").update(content).digest("hex");

			return Object.freeze({
				id: draft.id,
				to,
				destination,
				get content() {
					return new Uint8Array(content);
				},
				digest,
				provenance,
				get meta() {
					return cloneAndFreezeMetadata(metadata, draft.id);
				},
			});
		}),
	);
}

function validateProvenance(
	provenance: readonly Provenance[],
	artifactId: string,
): readonly Provenance[] {
	if (!Array.isArray(provenance)) {
		throw new CodegenPlanError(
			`Artifact "${artifactId}" has invalid provenance.`,
		);
	}
	return freezeArray(
		provenance.map((entry) => {
			if (
				entry.kind === "source" &&
				typeof entry.path === "string" &&
				entry.path.length > 0 &&
				(entry.line === undefined ||
					(Number.isInteger(entry.line) && entry.line > 0))
			) {
				return Object.freeze({ ...entry });
			}
			if (
				entry.kind === "artifact" &&
				typeof entry.id === "string" &&
				entry.id.length > 0
			) {
				return Object.freeze({ ...entry });
			}
			throw new CodegenPlanError(
				`Artifact "${artifactId}" has invalid provenance.`,
			);
		}),
	);
}

function validateArtifactSet(
	artifacts: readonly PlannedArtifact<string, unknown>[],
): void {
	const ids = new Map<string, PlannedArtifact<string, unknown>>();
	for (const artifact of artifacts) {
		const duplicateId = ids.get(artifact.id);
		if (duplicateId !== undefined) {
			throw new CodegenPlanError(
				`Artifact id "${artifact.id}" is defined more than once (${formatProvenance(
					duplicateId.provenance,
				)}; ${formatProvenance(artifact.provenance)}).`,
			);
		}
		ids.set(artifact.id, artifact);
	}

	for (const [index, artifact] of artifacts.entries()) {
		for (const other of artifacts.slice(index + 1)) {
			if (!pathsConflict(artifact.destination, other.destination)) {
				continue;
			}
			throw new CodegenPlanError(
				`Artifacts "${artifact.id}" and "${other.id}" have conflicting destinations "${artifact.destination}" and "${other.destination}" (${formatProvenance(
					artifact.provenance,
				)}; ${formatProvenance(other.provenance)}).`,
			);
		}
	}
}

function pathsConflict(left: string, right: string): boolean {
	const leftIdentity = pathIdentity(left);
	const rightIdentity = pathIdentity(right);
	return (
		leftIdentity === rightIdentity ||
		leftIdentity.startsWith(`${rightIdentity}${sep}`) ||
		rightIdentity.startsWith(`${leftIdentity}${sep}`)
	);
}

function validateStaleDestinations(
	staleChanges: readonly PlannedChange[],
	artifacts: readonly PlannedArtifact<string, unknown>[],
	manifests: readonly ManifestState[],
): void {
	for (const stale of staleChanges) {
		for (const artifact of artifacts) {
			if (!pathsConflict(stale.destination, artifact.destination)) {
				continue;
			}
			throw new CodegenPlanError(
				`Stale owned file "${stale.destination}" conflicts with planned artifact "${artifact.id}".`,
			);
		}
		for (const manifest of manifests) {
			if (!pathsConflict(stale.destination, manifest.destination)) {
				continue;
			}
			throw new CodegenOwnershipError(
				`Stale owned file "${stale.destination}" conflicts with ownership manifest "${manifest.destination}".`,
			);
		}
	}

	for (const [index, stale] of staleChanges.entries()) {
		for (const other of staleChanges.slice(index + 1)) {
			if (!pathsConflict(stale.destination, other.destination)) {
				continue;
			}
			throw new CodegenOwnershipError(
				`Ownership manifests claim conflicting stale files "${stale.destination}" and "${other.destination}".`,
			);
		}
	}
}

function validateArtifactReferences(
	artifacts: readonly PlannedArtifact<string, unknown>[],
): void {
	const ids = new Set(artifacts.map((artifact) => artifact.id));
	for (const artifact of artifacts) {
		for (const provenance of artifact.provenance) {
			if (provenance.kind === "artifact" && !ids.has(provenance.id)) {
				throw new CodegenPlanError(
					`Artifact "${artifact.id}" references unknown artifact "${provenance.id}".`,
				);
			}
		}
	}
}

function validateArtifactManifestCollisions(
	artifacts: readonly PlannedArtifact<string, unknown>[],
	outputs: ReadonlyMap<string, OutputContext>,
): void {
	for (const output of outputs.values()) {
		const manifest = manifestDescriptor(output);
		if (manifest === undefined) {
			continue;
		}
		for (const artifact of artifacts) {
			if (!pathsConflict(artifact.destination, manifest.destination)) {
				continue;
			}
			throw new CodegenPlanError(
				`Artifact "${artifact.id}" conflicts with ownership manifest "${manifest.destination}".`,
			);
		}
	}
}

async function inspectFileSystem<Metadata>(
	artifacts: readonly PlannedArtifact<string, Metadata>[],
	outputs: ReadonlyMap<string, OutputContext>,
	fileSystem: CodegenFileSystem,
): Promise<ExecutionPlan<Metadata>> {
	const changes: PlannedChange[] = [];
	const contents = new Map<string, Uint8Array>();
	const desiredByTarget = new Map<string, Set<string>>();

	for (const output of outputs.values()) {
		desiredByTarget.set(output.key, new Set());
	}

	for (const artifact of artifacts) {
		desiredByTarget.get(artifact.to.target)?.add(artifact.to.path);
		contents.set(artifact.destination, artifact.content);
		const output = outputs.get(artifact.to.target);
		if (output === undefined) {
			throw new CodegenPlanError(
				`Artifact "${artifact.id}" targets unknown output "${artifact.to.target}".`,
			);
		}
		await fileSystem.assertSafePath(output.root, artifact.destination);
		const current = await readForPlanning(artifact.destination, fileSystem);
		changes.push(
			freezeChange({
				kind:
					current === undefined
						? "create"
						: bytesEqual(current, artifact.content)
							? "unchanged"
							: "update",
				subject: "artifact",
				target: artifact.to.target,
				path: artifact.to.path,
				destination: artifact.destination,
				artifactId: artifact.id,
			}),
		);
	}

	const manifests: ManifestState[] = [];
	for (const output of outputs.values()) {
		const manifest = manifestDescriptor(output);
		if (manifest === undefined) {
			continue;
		}
		await fileSystem.assertSafePath(
			manifest.boundary,
			manifest.destination,
		);
		const current = await readForPlanning(manifest.destination, fileSystem);
		const previousFiles =
			current === undefined
				? validateInitialFiles(output)
				: parseManifest(current, output.key, manifest.destination);
		const files = [
			...(desiredByTarget.get(output.key) ?? new Set<string>()),
		].toSorted();
		const content = encoder.encode(
			`${JSON.stringify({ version: 1, files }, null, 2)}\n`,
		);
		manifests.push(
			Object.freeze({
				boundary: manifest.boundary,
				content,
				destination: manifest.destination,
				path: manifest.path,
				previousFiles,
				root: output.root,
				target: output.key,
			}),
		);
		contents.set(manifest.destination, content);
	}

	const staleChanges: PlannedChange[] = [];
	for (const manifest of manifests) {
		const files = [
			...(desiredByTarget.get(manifest.target) ?? new Set<string>()),
		];
		for (const stalePath of manifest.previousFiles) {
			if (files.includes(stalePath)) {
				continue;
			}
			const staleDestination = destinationWithin(
				manifest.root,
				stalePath,
			);
			await fileSystem.assertSafePath(manifest.root, staleDestination);
			const stale = await readForPlanning(staleDestination, fileSystem);
			if (stale !== undefined) {
				staleChanges.push(
					freezeChange({
						kind: "delete",
						subject: "stale",
						target: manifest.target,
						path: stalePath,
						destination: staleDestination,
					}),
				);
			}
		}
	}
	validateStaleDestinations(staleChanges, artifacts, manifests);
	changes.push(...staleChanges);

	for (const manifest of manifests) {
		const current = await readForPlanning(manifest.destination, fileSystem);
		changes.push(
			freezeChange({
				kind:
					current === undefined
						? "create"
						: bytesEqual(current, manifest.content)
							? "unchanged"
							: "update",
				subject: "manifest",
				target: manifest.target,
				path: manifest.path,
				destination: manifest.destination,
			}),
		);
	}

	return Object.freeze({
		artifacts,
		changes: freezeArray(changes),
		contents,
	});
}

async function readForPlanning(
	path: string,
	fileSystem: CodegenFileSystem,
): Promise<Uint8Array | undefined> {
	try {
		return await fileSystem.read(path);
	} catch (error) {
		throw new CodegenPlanError(
			`Cannot inspect "${path}": ${errorMessage(error)}`,
		);
	}
}

function parseManifest(
	content: Uint8Array,
	target: string,
	destination: string,
): readonly string[] {
	let value: unknown;
	try {
		value = JSON.parse(decoder.decode(content));
	} catch (error) {
		throw new CodegenOwnershipError(
			`Ownership manifest "${destination}" is invalid JSON: ${errorMessage(error)}`,
		);
	}
	if (
		typeof value !== "object" ||
		value === null ||
		!("version" in value) ||
		value.version !== 1 ||
		!("files" in value) ||
		!Array.isArray(value.files)
	) {
		throw new CodegenOwnershipError(
			`Ownership manifest "${destination}" for output "${target}" must contain version 1 and a files array.`,
		);
	}

	const files = value.files.map((path, index) => {
		if (typeof path !== "string") {
			throw new CodegenOwnershipError(
				`Ownership manifest "${destination}" has a non-string file at index ${index}.`,
			);
		}
		try {
			return validateRelativePath(
				path,
				`file ${index} in ownership manifest "${destination}"`,
			);
		} catch (error) {
			throw new CodegenOwnershipError(errorMessage(error));
		}
	});
	if (new Set(files.map(pathIdentity)).size !== files.length) {
		throw new CodegenOwnershipError(
			`Ownership manifest "${destination}" lists a file more than once.`,
		);
	}
	return freezeArray(files.toSorted(compareCodeUnits));
}

function validateInitialFiles(output: OutputContext): readonly string[] {
	const initialFiles = output.specification.ownership?.initialFiles;
	if (initialFiles === undefined) {
		return [];
	}
	if (!Array.isArray(initialFiles)) {
		throw new CodegenConfigurationError(
			`Initial ownership files for output "${output.key}" must be an array.`,
		);
	}
	const files = initialFiles.map((path, index) =>
		validateRelativePath(
			path,
			`initial ownership file ${index} for output "${output.key}"`,
		),
	);
	if (new Set(files.map(pathIdentity)).size !== files.length) {
		throw new CodegenConfigurationError(
			`Initial ownership files for output "${output.key}" contain a duplicate.`,
		);
	}
	return freezeArray(files.toSorted(compareCodeUnits));
}

function validateRelativePath(path: string, label: string): string {
	if (
		typeof path !== "string" ||
		path.length === 0 ||
		path.includes("\0") ||
		path.includes("\\") ||
		isAbsolute(path) ||
		win32.isAbsolute(path)
	) {
		throw new CodegenConfigurationError(
			`The ${label} must be a safe relative path; received "${String(path)}".`,
		);
	}
	const normalized = posix.normalize(path);
	const hasNonPortableSegment = path
		.split("/")
		.some((segment) => isUnsupportedPathSegment(segment));
	if (
		normalized !== path ||
		normalized === "." ||
		normalized === ".." ||
		normalized.startsWith("../") ||
		path.endsWith("/") ||
		hasNonPortableSegment
	) {
		throw new CodegenConfigurationError(
			`The ${label} must be a normalized, portable relative file path; received "${path}".`,
		);
	}
	return normalized;
}

function destinationWithin(root: string, path: string): string {
	const destination = resolve(root, path);
	if (!isWithin(root, destination)) {
		throw new CodegenConfigurationError(
			`Path "${path}" escapes output root "${root}".`,
		);
	}
	return destination;
}

function resolveManifestDestination(
	root: string,
	manifest: string,
	target: string,
): string {
	if (manifest.includes("\0") || manifest.length === 0) {
		throw new CodegenConfigurationError(
			`Ownership manifest for output "${target}" has an invalid path.`,
		);
	}
	if (isAbsolute(manifest)) {
		const destination = resolve(manifest);
		validateConfiguredAbsolutePath(
			destination,
			`ownership manifest for output "${target}"`,
		);
		return destination;
	}
	if (win32.isAbsolute(manifest)) {
		throw new CodegenConfigurationError(
			`Ownership manifest "${manifest}" uses an absolute path for a different platform.`,
		);
	}
	return destinationWithin(
		root,
		validateRelativePath(
			manifest,
			`ownership manifest for output "${target}"`,
		),
	);
}

function validateConfiguredAbsolutePath(path: string, label: string): void {
	if (process.platform !== "win32") {
		return;
	}
	const root = win32.parse(path).root;
	const segments = path
		.slice(root.length)
		.split(/[\\/]/u)
		.filter((segment) => segment.length > 0);
	if (segments.some((segment) => isUnsupportedPathSegment(segment))) {
		throw new CodegenConfigurationError(
			`The ${label} contains a path segment unsupported on Windows: "${path}".`,
		);
	}
}

function isUnsupportedPathSegment(segment: string): boolean {
	return (
		segment
			.split("")
			.some((character) => character.charCodeAt(0) <= 0x1f) ||
		/[<>:"|?*]/u.test(segment) ||
		/[. ]$/u.test(segment) ||
		(process.platform === "win32" &&
			/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(segment))
	);
}

function manifestDescriptor(
	output: OutputContext,
): ManifestDescriptor | undefined {
	const manifest = output.specification.ownership?.manifest;
	if (manifest === undefined) {
		return undefined;
	}
	const destination = resolveManifestDestination(
		output.root,
		manifest,
		output.key,
	);
	return Object.freeze({
		boundary: isAbsolute(manifest) ? dirname(destination) : output.root,
		destination,
		path: manifest,
		root: output.root,
		target: output.key,
	});
}

async function assertChangePathIsSafe(
	change: PlannedChange,
	outputs: ReadonlyMap<string, OutputContext>,
	fileSystem: CodegenFileSystem,
): Promise<void> {
	const output = outputs.get(change.target);
	if (output === undefined) {
		throw new CodegenPlanError(
			`Change targets unknown output "${change.target}".`,
		);
	}
	if (change.subject !== "manifest") {
		await fileSystem.assertSafePath(output.root, change.destination);
		return;
	}
	const manifest = manifestDescriptor(output);
	if (manifest === undefined || manifest.destination !== change.destination) {
		throw new CodegenPlanError(
			`Manifest change for output "${change.target}" has no matching configuration.`,
		);
	}
	await fileSystem.assertSafePath(manifest.boundary, manifest.destination);
}

function isWithin(root: string, path: string): boolean {
	const remainder = relative(root, path);
	return (
		remainder === "" ||
		(!remainder.startsWith("..") && !isAbsolute(remainder))
	);
}

function globToRegExp(glob: string): RegExp {
	if (
		glob.length === 0 ||
		glob.includes("\\") ||
		glob.startsWith("/") ||
		glob.includes("\0")
	) {
		throw new CodegenConfigurationError(`Invalid text-set glob "${glob}".`);
	}

	let source = "^";
	for (let index = 0; index < glob.length; index += 1) {
		const character = glob[index] ?? "";
		if (character === "*") {
			if (glob[index + 1] === "*") {
				index += 1;
				if (glob[index + 1] === "/") {
					index += 1;
					source += "(?:.*/)?";
				} else {
					source += ".*";
				}
			} else {
				source += "[^/]*";
			}
		} else if (character === "?") {
			source += "[^/]";
		} else {
			source += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
		}
	}
	return new RegExp(`${source}$`);
}

function portablePath(path: string): string {
	return path.replaceAll("\\", "/");
}

function compareCodeUnits(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function pathIdentity(path: string): string {
	return path.normalize("NFC").toUpperCase().toLowerCase();
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
	if (left.byteLength !== right.byteLength) {
		return false;
	}
	return left.every((byte, index) => byte === right[index]);
}

function cloneAndFreezeMetadata<Metadata>(
	metadata: Metadata,
	artifactId: string,
): Metadata {
	return deepFreeze(cloneMetadata(metadata, artifactId));
}

function cloneMetadata<Metadata>(
	metadata: Metadata,
	artifactId: string,
): Metadata {
	try {
		return structuredClone(metadata);
	} catch (error) {
		throw new CodegenPlanError(
			`Artifact "${artifactId}" metadata is not cloneable: ${errorMessage(error)}`,
		);
	}
}

function deepFreeze<T>(value: T): T {
	if (
		typeof value !== "object" ||
		value === null ||
		ArrayBuffer.isView(value) ||
		Object.isFrozen(value)
	) {
		return value;
	}
	for (const nested of Object.values(value)) {
		deepFreeze(nested);
	}
	return Object.freeze(value);
}

function freezeArray<T>(items: readonly T[]): readonly T[] {
	return Object.freeze([...items]);
}

function freezeChange(change: PlannedChange): PlannedChange {
	return Object.freeze(change);
}

function formatProvenance(provenance: readonly Provenance[]): string {
	if (provenance.length === 0) {
		return "no provenance";
	}
	return provenance
		.map((entry) =>
			entry.kind === "source"
				? `${entry.path}${entry.line === undefined ? "" : `:${entry.line}`}`
				: `artifact:${entry.id}`,
		)
		.join(", ");
}

function errorCode(error: unknown): string | undefined {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string"
	) {
		return error.code;
	}
	return undefined;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

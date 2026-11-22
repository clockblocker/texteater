import { createHash } from "node:crypto";
import { dirname, isAbsolute, resolve } from "node:path";
import {
	CodegenConfigurationError,
	CodegenOwnershipError,
	CodegenPlanError,
} from "./errors.js";
import { type CodegenFileSystem, nodeFileSystem } from "./file-system.js";
import { materializeInputs } from "./inputs.js";
import {
	validateArtifactManifestCollisions,
	validateArtifactSet,
	validateManifestDestinations,
	validateStaleDestinations,
} from "./path-conflicts.js";
import {
	compareCodeUnits,
	destinationWithin,
	pathIdentity,
	resolveManifestDestination,
	validateConfiguredAbsolutePath,
	validateRelativePath,
} from "./paths.js";
import {
	type ArtifactDraft,
	type CodegenRecipe,
	type CodegenRun,
	type Inputs,
	type Output,
	type Outputs,
	type PlannedArtifact,
	type PlannedChange,
	type Provenance,
	type RunOptions,
	recipeDefinition,
} from "./types.js";
import {
	bytesEqual,
	cloneAndFreezeMetadata,
	cloneMetadata,
	deepFreeze,
	errorMessage,
	freezeArray,
	freezeChange,
} from "./values.js";

type OutputContext = Readonly<{
	key: string;
	root: string;
	specification: Output;
}>;

type ManifestState = Readonly<{
	boundary: string;
	content: Uint8Array;
	current: Uint8Array | undefined;
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
	assertValidRunMode(options.mode);
	const definition = recipe[recipeDefinition];
	if (definition === undefined) {
		throw new CodegenConfigurationError(
			"The supplied value is not a codegen recipe.",
		);
	}

	const outputs = prepareOutputs(definition.outputs);
	const manifestDescriptors = collectManifestDescriptors(outputs);
	validateManifestDestinations(manifestDescriptors);
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
	validateArtifactManifestCollisions(artifacts, manifestDescriptors);

	const plan = await inspectFileSystem(artifacts, outputs, fileSystem);
	const changed = plan.changes.some((change) => change.kind !== "unchanged");
	const applied =
		options.mode === "write"
			? await applyPlannedChanges(plan, outputs, fileSystem)
			: [];

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

function assertValidRunMode(mode: RunOptions["mode"]): void {
	if (mode !== "check" && mode !== "write") {
		throw new CodegenConfigurationError(
			`Unknown codegen mode "${String(mode)}".`,
		);
	}
}

async function applyPlannedChanges<Metadata>(
	plan: ExecutionPlan<Metadata>,
	outputs: ReadonlyMap<string, OutputContext>,
	fileSystem: CodegenFileSystem,
): Promise<PlannedChange[]> {
	const applied: PlannedChange[] = [];
	const applyMatching = async (isManifest: boolean): Promise<void> => {
		for (const change of plan.changes) {
			if (
				change.kind === "unchanged" ||
				(change.subject === "manifest") !== isManifest
			) {
				continue;
			}
			await applyChange(change, plan.contents, outputs, fileSystem);
			applied.push(change);
		}
	};

	await applyMatching(false);
	// Ownership is committed last: an interrupted artifact write never records
	// files as successfully owned before their mutations have completed.
	await applyMatching(true);
	return applied;
}

async function applyChange(
	change: PlannedChange,
	contents: ReadonlyMap<string, Uint8Array>,
	outputs: ReadonlyMap<string, OutputContext>,
	fileSystem: CodegenFileSystem,
): Promise<void> {
	await assertChangePathIsSafe(change, outputs, fileSystem);
	if (change.kind === "delete") {
		await fileSystem.remove(change.destination);
		return;
	}
	const content = contents.get(change.destination);
	if (content === undefined) {
		const label =
			change.subject === "manifest" ? "manifest content" : "content";
		throw new CodegenPlanError(
			`No planned ${label} for "${change.destination}".`,
		);
	}
	await fileSystem.write(change.destination, content);
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

function collectManifestDescriptors(
	outputs: ReadonlyMap<string, OutputContext>,
): ManifestDescriptor[] {
	const manifests: ManifestDescriptor[] = [];
	for (const output of outputs.values()) {
		const manifest = manifestDescriptor(output);
		if (manifest !== undefined) {
			manifests.push(manifest);
		}
	}
	return manifests;
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

async function inspectFileSystem<Metadata>(
	artifacts: readonly PlannedArtifact<string, Metadata>[],
	outputs: ReadonlyMap<string, OutputContext>,
	fileSystem: CodegenFileSystem,
): Promise<ExecutionPlan<Metadata>> {
	const { changes, contents, desiredByTarget } = await planArtifactChanges(
		artifacts,
		outputs,
		fileSystem,
	);
	const manifests = await loadManifestStates(
		outputs,
		desiredByTarget,
		contents,
		fileSystem,
	);
	const staleChanges = await planStaleChanges(
		manifests,
		desiredByTarget,
		fileSystem,
	);
	validateStaleDestinations(staleChanges, artifacts, manifests);
	changes.push(...staleChanges, ...planManifestChanges(manifests));

	return Object.freeze({
		artifacts,
		changes: freezeArray(changes),
		contents,
	});
}

async function planArtifactChanges<Metadata>(
	artifacts: readonly PlannedArtifact<string, Metadata>[],
	outputs: ReadonlyMap<string, OutputContext>,
	fileSystem: CodegenFileSystem,
): Promise<{
	changes: PlannedChange[];
	contents: Map<string, Uint8Array>;
	desiredByTarget: Map<string, Set<string>>;
}> {
	const changes: PlannedChange[] = [];
	const contents = new Map<string, Uint8Array>();
	const desiredByTarget = new Map<string, Set<string>>();

	for (const output of outputs.values()) {
		desiredByTarget.set(output.key, new Set());
	}

	for (const artifact of artifacts) {
		desiredByTarget.get(artifact.to.target)?.add(artifact.to.path);
		const content = artifact.content;
		contents.set(artifact.destination, content);
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
				kind: changeKindForContent(current, content),
				subject: "artifact",
				target: artifact.to.target,
				path: artifact.to.path,
				destination: artifact.destination,
				artifactId: artifact.id,
			}),
		);
	}

	return { changes, contents, desiredByTarget };
}

async function loadManifestStates(
	outputs: ReadonlyMap<string, OutputContext>,
	desiredByTarget: ReadonlyMap<string, ReadonlySet<string>>,
	contents: Map<string, Uint8Array>,
	fileSystem: CodegenFileSystem,
): Promise<ManifestState[]> {
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
				? []
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
				current,
				destination: manifest.destination,
				path: manifest.path,
				previousFiles,
				root: output.root,
				target: output.key,
			}),
		);
		contents.set(manifest.destination, content);
	}
	return manifests;
}

async function planStaleChanges(
	manifests: readonly ManifestState[],
	desiredByTarget: ReadonlyMap<string, ReadonlySet<string>>,
	fileSystem: CodegenFileSystem,
): Promise<PlannedChange[]> {
	const staleChanges: PlannedChange[] = [];
	for (const manifest of manifests) {
		const desired = desiredByTarget.get(manifest.target);
		for (const stalePath of manifest.previousFiles) {
			if (desired?.has(stalePath)) {
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
	return staleChanges;
}

function planManifestChanges(
	manifests: readonly ManifestState[],
): PlannedChange[] {
	return manifests.map((manifest) =>
		freezeChange({
			kind: changeKindForContent(manifest.current, manifest.content),
			subject: "manifest",
			target: manifest.target,
			path: manifest.path,
			destination: manifest.destination,
		}),
	);
}

function changeKindForContent(
	current: Uint8Array | undefined,
	desired: Uint8Array,
): "create" | "unchanged" | "update" {
	if (current === undefined) {
		return "create";
	}
	return bytesEqual(current, desired) ? "unchanged" : "update";
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

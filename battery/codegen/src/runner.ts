import { createHash } from "node:crypto";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import {
	CodegenConfigurationError,
	CodegenOwnershipError,
	CodegenPlanError,
} from "./errors.js";
import { type CodegenFileSystem, nodeFileSystem } from "./file-system.js";
import { materializeInputs } from "./inputs.js";
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
	formatProvenance,
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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

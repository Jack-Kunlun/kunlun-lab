interface WorkspaceManifest {
  manifest: unknown;
  path: string;
}

export interface VersionPolicyInput {
  nodeVersion: string;
  nvmrc: string;
  rootManifest: unknown;
  workspaceManifests: readonly WorkspaceManifest[];
}

type JsonRecord = Record<string, unknown>;

const EXACT_STABLE_VERSION = /^\d+\.\d+\.\d+$/;
const EXACT_PACKAGE_MANAGER = /^pnpm@\d+\.\d+\.\d+$/;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDependencySection(
  manifest: JsonRecord,
  manifestPath: string,
  section: "dependencies" | "devDependencies" | "optionalDependencies" | "peerDependencies",
): string[] {
  const dependencies = manifest[section];

  if (dependencies === undefined) {
    return [];
  }

  if (!isRecord(dependencies)) {
    return [`${manifestPath} ${section} must be an object`];
  }

  return Object.entries(dependencies).flatMap(([name, version]) => {
    if (version === "workspace:*") {
      return [];
    }

    if (typeof version !== "string" || !EXACT_STABLE_VERSION.test(version)) {
      return [`${manifestPath} ${section}.${name} must use an exact stable version`];
    }

    return [];
  });
}

function validateManifest(manifest: unknown, manifestPath: string): string[] {
  if (!isRecord(manifest)) {
    return [`${manifestPath} must contain a JSON object`];
  }

  return (
    ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const
  ).flatMap((section) => validateDependencySection(manifest, manifestPath, section));
}

export function validateVersionPolicy(input: VersionPolicyInput): string[] {
  const issues: string[] = [];
  const normalizedNodeVersion = input.nodeVersion.trim();
  const normalizedNvmrc = input.nvmrc.trim();

  if (!EXACT_STABLE_VERSION.test(normalizedNodeVersion)) {
    issues.push(".node-version must contain an exact semantic version");

    return issues;
  }

  const nodeMajor = normalizedNodeVersion.slice(0, normalizedNodeVersion.indexOf("."));

  if (normalizedNvmrc !== normalizedNodeVersion) {
    issues.push(`.nvmrc must match .node-version (${normalizedNodeVersion})`);
  }

  if (!isRecord(input.rootManifest)) {
    issues.push("package.json must contain a JSON object");

    return issues;
  }

  const packageManager = input.rootManifest.packageManager;

  if (typeof packageManager !== "string" || !EXACT_PACKAGE_MANAGER.test(packageManager)) {
    issues.push("packageManager must pin an exact pnpm version");
  }

  const engines = input.rootManifest.engines;
  const expectedEngine = `${nodeMajor}.x`;

  if (!isRecord(engines) || engines.node !== expectedEngine) {
    issues.push(`engines.node must be ${expectedEngine}`);
  }

  issues.push(...validateManifest(input.rootManifest, "package.json"));

  for (const workspace of input.workspaceManifests) {
    issues.push(...validateManifest(workspace.manifest, workspace.path));
  }

  return issues;
}

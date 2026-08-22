import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface SmokeConfig {
  labPort: string;
  projectName: string;
  environment: NodeJS.ProcessEnv;
  composeArguments: string[];
}

interface CommandResult {
  error: Error | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  timeoutMs: number;
}

interface RunOptions {
  allowFailure?: boolean;
  timeoutMs?: number;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const composeFile = resolve(repositoryRoot, "compose.yaml");
const healthTimeoutMs = 180_000;
const healthPollIntervalMs = 3_000;
const requestTimeoutMs = 10_000;
const commandMaxBuffer = 32 * 1024 * 1024;
const dockerCommandTimeoutMs = 30_000;
const composeBuildTimeoutMs = 10 * 60 * 1000;
const composeLogsTimeoutMs = 30_000;
const composeCleanupTimeoutMs = 60_000;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function errorMessage(error: unknown): string {
  return toError(error).message;
}

function createConfig(): SmokeConfig {
  const configuredLabPort = process.env.LAB_PORT?.trim();
  const labPort =
    configuredLabPort === undefined || configuredLabPort === "" ? "3000" : configuredLabPort;

  if (!/^[1-9]\d{0,4}$/.test(labPort) || Number(labPort) > 65_535) {
    throw new Error(`LAB_PORT must be an integer between 1 and 65535, received: ${labPort}`);
  }

  const configuredProjectName = process.env.DOCKER_SMOKE_PROJECT?.trim();
  const projectName =
    configuredProjectName === undefined || configuredProjectName === ""
      ? `kunlun-lab-smoke-${String(process.pid)}`
      : configuredProjectName;

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(projectName)) {
    throw new Error(
      `DOCKER_SMOKE_PROJECT must start with a lowercase letter or digit and contain only lowercase letters, digits, underscores, or hyphens: ${projectName}`,
    );
  }

  return {
    labPort,
    projectName,
    environment: {
      ...process.env,
      LAB_PORT: labPort,
    },
    composeArguments: ["compose", "-p", projectName, "-f", composeFile],
  };
}

function executeFile(
  config: SmokeConfig,
  executable: string,
  argumentsList: string[],
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((promiseResolve) => {
    execFile(
      executable,
      argumentsList,
      {
        cwd: repositoryRoot,
        env: config.environment,
        shell: false,
        windowsHide: true,
        maxBuffer: commandMaxBuffer,
        timeout: timeoutMs,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        const timedOut = Boolean(
          error && typeof error === "object" && "killed" in error && error.killed,
        );

        promiseResolve({ error, stdout, stderr, timedOut, timeoutMs });
      },
    );
  });
}

function formatCommand(argumentsList: string[]): string {
  return ["docker", ...argumentsList].map((argument) => JSON.stringify(argument)).join(" ");
}

function commandError(argumentsList: string[], result: CommandResult): Error {
  const details = [
    result.timedOut ? `process exceeded timeout of ${String(result.timeoutMs / 1000)} seconds` : "",
    result.error ? errorMessage(result.error) : "",
    result.stderr.trim(),
    result.stdout.trim(),
  ]
    .filter(Boolean)
    .join("\n");
  const suffix = details ? `:\n${details}` : "";

  return new Error(`${formatCommand(argumentsList)} failed${suffix}`);
}

async function runDocker(
  config: SmokeConfig,
  argumentsList: string[],
  { allowFailure = false, timeoutMs = dockerCommandTimeoutMs }: RunOptions = {},
): Promise<CommandResult> {
  const result = await executeFile(config, "docker", argumentsList, timeoutMs);

  if (result.error && !allowFailure) {
    throw commandError(argumentsList, result);
  }

  return result;
}

async function runCompose(
  config: SmokeConfig,
  argumentsList: string[],
  options?: RunOptions,
): Promise<CommandResult> {
  return runDocker(config, [...config.composeArguments, ...argumentsList], options);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((promiseResolve) => setTimeout(promiseResolve, milliseconds));
}

async function getWebContainerId(config: SmokeConfig): Promise<string> {
  const result = await runCompose(config, ["ps", "-q", "web"], { allowFailure: true });

  if (result.error) {
    return "";
  }

  return result.stdout.trim().split(/\s+/)[0] ?? "";
}

async function getHealthStatus(config: SmokeConfig, containerId: string): Promise<string> {
  const result = await runDocker(
    config,
    ["inspect", "--format", "{{.State.Health.Status}}", containerId],
    { allowFailure: true },
  );

  return result.error ? "" : result.stdout.trim();
}

async function waitForHealthy(config: SmokeConfig): Promise<string> {
  const deadline = Date.now() + healthTimeoutMs;
  let containerId = "";
  let lastStatus = "";

  while (Date.now() < deadline) {
    if (!containerId) {
      // Container discovery is intentionally sequential polling.
      // eslint-disable-next-line no-await-in-loop
      containerId = await getWebContainerId(config);
    }

    if (containerId) {
      // Health inspection must follow the container discovery result.
      // eslint-disable-next-line no-await-in-loop
      lastStatus = await getHealthStatus(config, containerId);

      if (lastStatus === "healthy") {
        return containerId;
      }

      if (lastStatus === "unhealthy") {
        throw new Error(`web service container became unhealthy in project ${config.projectName}`);
      }
    }

    const remainingMs = deadline - Date.now();

    if (remainingMs > 0) {
      // Keep the polling interval sequential and bounded by the deadline.
      // eslint-disable-next-line no-await-in-loop
      await wait(Math.min(healthPollIntervalMs, remainingMs));
    }
  }

  throw new Error(
    `web service container did not become healthy within ${String(healthTimeoutMs / 1000)} seconds in project ${config.projectName} (last status: ${lastStatus || "unknown"})`,
  );
}

async function request(url: string): Promise<Response> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
  } catch (error) {
    throw new Error(`request failed for ${url}: ${errorMessage(error)}`, { cause: error });
  }
}

async function checkHealth(baseUrl: string): Promise<void> {
  const url = `${baseUrl}/api/health`;
  const response = await request(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`/api/health returned HTTP ${String(response.status)}: ${body}`);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(await response.text()) as unknown;
  } catch (error) {
    throw new Error(`/api/health returned invalid JSON: ${errorMessage(error)}`, { cause: error });
  }

  if (!isObjectRecord(payload)) {
    throw new Error(`/api/health response mismatch: ${JSON.stringify(payload)}`);
  }

  const keys = Object.keys(payload).sort();
  const status = payload.status;

  if (status !== "ok" || keys.length !== 1 || keys[0] !== "status") {
    throw new Error(`/api/health response mismatch: ${JSON.stringify(payload)}`);
  }
}

async function checkHome(baseUrl: string): Promise<void> {
  const response = await request(`${baseUrl}/`);

  await response.arrayBuffer();

  if (response.status !== 200) {
    throw new Error(`homepage returned HTTP ${String(response.status)}, expected 200`);
  }
}

async function checkContainerUid(config: SmokeConfig, containerId: string): Promise<string> {
  const result = await runDocker(config, ["exec", containerId, "id", "-u"]);
  const uid = result.stdout.trim();

  if (!/^\d+$/.test(uid)) {
    throw new Error(
      `could not determine the web container UID: ${uid === "" ? "empty response" : uid}`,
    );
  }

  if (uid === "0") {
    throw new Error("web container is running as root (UID 0)");
  }

  return uid;
}

async function printComposeLogs(config: SmokeConfig): Promise<void> {
  const argumentsList = [...config.composeArguments, "logs", "--no-color"];
  const result = await runDocker(config, argumentsList, {
    allowFailure: true,
    timeoutMs: composeLogsTimeoutMs,
  });
  const output = [result.stdout.trimEnd(), result.stderr.trimEnd()].filter(Boolean).join("\n");

  process.stderr.write(`\n--- docker compose logs for project ${config.projectName} ---\n`);
  process.stderr.write(`${output === "" ? "(no logs available)" : output}\n`);

  if (result.error) {
    process.stderr.write(
      `Unable to read Compose logs: ${commandError(argumentsList, result).message}\n`,
    );
  }
}

async function runSmoke(config: SmokeConfig): Promise<{ uid: string }> {
  await runCompose(config, ["up", "-d", "--build"], { timeoutMs: composeBuildTimeoutMs });
  const containerId = await waitForHealthy(config);
  const baseUrl = `http://localhost:${config.labPort}`;

  await checkHealth(baseUrl);
  await checkHome(baseUrl);
  const uid = await checkContainerUid(config, containerId);

  return { uid };
}

async function main(): Promise<void> {
  const config = createConfig();
  let failure;
  let result;

  try {
    result = await runSmoke(config);
  } catch (error) {
    failure = toError(error);
    await printComposeLogs(config);
  } finally {
    const cleanupArguments = [...config.composeArguments, "down"];
    const cleanupResult = await runDocker(config, cleanupArguments, {
      allowFailure: true,
      timeoutMs: composeCleanupTimeoutMs,
    });

    if (cleanupResult.error) {
      const cleanupError = commandError(cleanupArguments, cleanupResult);

      process.stderr.write(`Compose cleanup failed: ${cleanupError.message}\n`);

      if (!failure) {
        await printComposeLogs(config);
        failure = cleanupError;
      }
    }
  }

  if (failure) {
    throw failure;
  }

  if (!result) {
    throw new Error("smoke did not produce a result");
  }

  process.stdout.write(
    `smoke passed: /api/health status=ok, homepage=200, container UID=${result.uid}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${errorMessage(error)}\n`);
  process.exitCode = 1;
});

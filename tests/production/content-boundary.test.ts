import { strict as assert } from "node:assert";
import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputEntry = path.join(repositoryRoot, "apps/web/.output/server/index.mjs");
const requestTimeoutMs = 5_000;
const startupTimeoutMs = 60_000;
const shutdownTimeoutMs = 5_000;
const startupAttempts = 3;
const startupPollIntervalMs = 250;
const exactHealthPayload = JSON.stringify({ status: "ok" });

const securityHeaders = {
  "content-security-policy": "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

const jsonErrorSecurityHeaders = {
  "content-security-policy": "script-src 'none'; frame-ancestors 'none';",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

const forbiddenDraftContent = [
  "draft-deep-link-fixture",
  "深链草稿回归夹具",
  "此内容仅用于验证草稿文章不会进入公开索引或通过深链访问。",
  "/works/jd-skill-radar",
  "当前发布策略",
  "工具当前处于 alpha 阶段",
];
const processOutput = new WeakMap<ChildProcess, string[]>();
const processErrors = new WeakMap<ChildProcess, Error>();
const processExited = new WeakMap<ChildProcess, boolean>();
const processClosed = new WeakMap<ChildProcess, boolean>();
const processClosePromises = new WeakMap<ChildProcess, Promise<void>>();

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function closesWithin(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      waitForClose(child).then(() => true),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => {
          resolve(false);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

async function reservePort(): Promise<number> {
  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  const address = server.address();

  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Could not determine the reserved HTTP port.");
  }

  const port = address.port;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);

        return;
      }

      resolve();
    });
  });

  return port;
}

function startProductionServer(port: number): ChildProcess {
  const childEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    HOST: "127.0.0.1",
    NITRO_HOST: "127.0.0.1",
    NODE_ENV: "production",
    NITRO_PORT: String(port),
    PORT: String(port),
  };

  delete childEnvironment.NITRO_UNIX_SOCKET;
  delete childEnvironment.NITRO_SSL_CERT;
  delete childEnvironment.NITRO_SSL_KEY;

  const child = spawn(process.execPath, [outputEntry], {
    cwd: repositoryRoot,
    env: childEnvironment,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  trackChildProcess(child);

  return child;
}

function trackChildProcess(child: ChildProcess): void {
  const output: string[] = [];

  processOutput.set(child, output);

  child.once("exit", () => processExited.set(child, true));
  child.once("close", () => {
    processClosed.set(child, true);
    processExited.set(child, true);
  });
  child.on("error", (error: Error) => {
    processErrors.set(child, error);
    processExited.set(child, true);
    output.push(`${error.stack ?? error.message}\n`);
  });
  child.stdout?.on("data", (chunk: Buffer) => output.push(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => output.push(chunk.toString()));
}

function getProcessOutput(child: ChildProcess): string {
  return processOutput.get(child)?.join("") ?? "";
}

function getProcessError(child: ChildProcess): Error | undefined {
  return processErrors.get(child);
}

function hasProcessExited(child: ChildProcess): boolean {
  return processExited.get(child) === true || child.exitCode !== null || child.signalCode !== null;
}

function hasProcessClosed(child: ChildProcess): boolean {
  return processClosed.get(child) === true;
}

function formatProcessFailure(child: ChildProcess): string {
  const error = getProcessError(child);
  const output = getProcessOutput(child);
  const details = [
    error === undefined ? "" : `error: ${error.message}`,
    output.length === 0 ? "" : `output:\n${output}`,
  ].filter(Boolean);

  return details.length === 0 ? "no child error or output" : details.join("\n");
}

function isAddressInUse(error: unknown, child?: ChildProcess): boolean {
  if (error instanceof Error && error.message.includes("EADDRINUSE")) {
    return true;
  }

  return child !== undefined && formatProcessFailure(child).includes("EADDRINUSE");
}

async function waitForServer(child: ChildProcess, baseUrl: string): Promise<void> {
  const deadline = Date.now() + startupTimeoutMs;
  let lastResponseStatus: number | undefined;
  const childClose = waitForClose(child);

  while (Date.now() < deadline) {
    const processError = getProcessError(child);

    if (processError !== undefined || hasProcessExited(child)) {
      throw new Error(`Production server exited before startup:\n${formatProcessFailure(child)}`, {
        cause: processError,
      });
    }

    let probeResult: HealthProbeResult;

    try {
      // The server must be polled sequentially until its listener is ready.
      // eslint-disable-next-line no-await-in-loop
      probeResult = await Promise.race([
        fetch(`${baseUrl}/api/health`, {
          signal: AbortSignal.timeout(requestTimeoutMs),
        }).then((probeResponse) => ({ kind: "response" as const, response: probeResponse })),
        childClose.then(() => ({ kind: "exit" as const })),
      ]);
    } catch (_error: unknown) {
      // The listener may not be ready yet; continue polling until the deadline.

      // eslint-disable-next-line no-await-in-loop
      await wait(startupPollIntervalMs);
      continue;
    }

    if (probeResult.kind === "exit") {
      throw new Error(`Production server exited before startup:\n${formatProcessFailure(child)}`, {
        cause: getProcessError(child),
      });
    }

    const response = probeResult.response;

    // The response body belongs to the current sequential startup probe.
    // eslint-disable-next-line no-await-in-loop
    const responseBody = await response.text();

    if (response.status === 200) {
      if (responseBody !== exactHealthPayload) {
        throw new Error(
          `Production health probe returned an unexpected HTTP 200 payload: ${responseBody}`,
        );
      }

      if (getProcessError(child) !== undefined || hasProcessExited(child)) {
        throw new Error(
          `Production server exited before startup:\n${formatProcessFailure(child)}`,
          { cause: getProcessError(child) },
        );
      }

      return;
    }

    lastResponseStatus = response.status;

    // eslint-disable-next-line no-await-in-loop
    await wait(startupPollIntervalMs);
  }

  throw new Error(
    `Production server did not start within ${String(startupTimeoutMs / 1000)} seconds` +
      `${lastResponseStatus === undefined ? "" : ` (last HTTP status ${String(lastResponseStatus)})`}:\n${formatProcessFailure(child)}`,
  );
}

function waitForClose(child: ChildProcess): Promise<void> {
  if (hasProcessClosed(child)) {
    return Promise.resolve();
  }

  const existingPromise = processClosePromises.get(child);

  if (existingPromise !== undefined) {
    return existingPromise;
  }

  const closePromise = new Promise<void>((resolve) => {
    const resolveClose = (): void => {
      processClosed.set(child, true);
      processExited.set(child, true);
      resolve();
    };

    child.once("close", resolveClose);

    if (hasProcessClosed(child)) {
      resolveClose();
    }
  });

  processClosePromises.set(child, closePromise);

  return closePromise;
}

async function stopProductionServer(child: ChildProcess | undefined): Promise<void> {
  if (child === undefined || hasProcessClosed(child)) {
    return;
  }

  if (!hasProcessExited(child) && child.pid !== undefined) {
    try {
      child.kill("SIGTERM");
    } catch (_error: unknown) {
      // The process may have exited between the state check and the signal.
    }
  }

  const closedAfterTerm = await closesWithin(child, shutdownTimeoutMs);

  if (!closedAfterTerm && !hasProcessExited(child)) {
    if (child.pid !== undefined) {
      try {
        child.kill("SIGKILL");
      } catch (_error: unknown) {
        // The process may have exited between the two signal attempts.
      }
    }

    const closedAfterKill = await closesWithin(child, shutdownTimeoutMs);

    if (!closedAfterKill && !hasProcessClosed(child)) {
      child.stdout?.destroy();
      child.stderr?.destroy();

      const closedAfterDestroy = await closesWithin(child, shutdownTimeoutMs);

      if (!closedAfterDestroy && !hasProcessClosed(child)) {
        throw new Error(
          `Production server did not close after SIGKILL (pid ${String(child.pid)}).`,
        );
      }
    }
  } else if (!closedAfterTerm && hasProcessExited(child)) {
    child.stdout?.destroy();
    child.stderr?.destroy();

    const closedAfterDestroy = await closesWithin(child, shutdownTimeoutMs);

    if (!closedAfterDestroy && !hasProcessClosed(child)) {
      throw new Error("Exited production server did not close its stdio.");
    }
  }
}

interface EndpointResponse {
  body: string;
  response: Response;
}

type HealthProbeResult = { kind: "response"; response: Response } | { kind: "exit" };

async function readEndpoint(
  baseUrl: string,
  pathname: string,
  expectedStatus = 200,
  headers?: HeadersInit,
): Promise<EndpointResponse> {
  const requestInit: RequestInit = {
    signal: AbortSignal.timeout(requestTimeoutMs),
  };

  if (headers !== undefined) {
    requestInit.headers = headers;
  }

  const response = await fetch(`${baseUrl}${pathname}`, requestInit);
  const body = await response.text();

  assert.equal(
    response.status,
    expectedStatus,
    `${pathname} should return HTTP ${String(expectedStatus)}`,
  );

  return { body, response };
}

function decodeSqlDump(encodedDump: string, endpoint: string): string {
  const normalizedDump = encodedDump.trim();

  if (
    normalizedDump.length === 0 ||
    normalizedDump.length % 4 !== 0 ||
    !/^[A-Za-z\d+/]*={0,2}$/u.test(normalizedDump)
  ) {
    throw new Error(`${endpoint} returned invalid base64 content.`);
  }

  try {
    const decodedDump: unknown = JSON.parse(
      gunzipSync(Buffer.from(normalizedDump, "base64")).toString("utf8"),
    );

    if (
      !Array.isArray(decodedDump) ||
      !decodedDump.every((statement) => typeof statement === "string")
    ) {
      throw new Error("decoded dump must be a JSON array of SQL statements");
    }

    return decodedDump.join("\n");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`${endpoint} could not be decoded: ${message}`, { cause: error });
  }
}

async function queryCollection(baseUrl: string, collection: "articles" | "works"): Promise<string> {
  const response = await fetch(`${baseUrl}/__nuxt_content/${collection}/query`, {
    body: JSON.stringify({ sql: `SELECT * FROM _content_${collection} ORDER BY stem ASC` }),
    headers: { "content-type": "application/json" },
    method: "POST",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  assert.equal(response.status, 200, `${collection} query should return HTTP 200`);

  return response.text();
}

function assertNoDraftContent(body: string, endpoint: string): void {
  for (const marker of forbiddenDraftContent) {
    assert.equal(body.includes(marker), false, `${endpoint} must not contain ${marker}`);
  }
}

function assertContainsMarkers(body: string, markers: readonly string[], endpoint: string): void {
  for (const marker of markers) {
    assert.equal(body.includes(marker), true, `${endpoint} should contain ${marker}`);
  }
}

function assertSecurityHeaders(
  response: Response,
  endpoint: string,
  options: { health?: boolean } = {},
): void {
  for (const [header, expectedValue] of Object.entries(securityHeaders)) {
    assert.equal(
      response.headers.get(header),
      expectedValue,
      `${endpoint} should include ${header}: ${expectedValue}`,
    );
  }

  if (options.health === true) {
    assert.equal(
      response.headers.get("cache-control"),
      "no-store",
      `${endpoint} should not be cached`,
    );
  }
}

function assertJsonErrorSecurityHeaders(response: Response, endpoint: string): void {
  for (const [header, expectedValue] of Object.entries(jsonErrorSecurityHeaders)) {
    assert.equal(
      response.headers.get(header),
      expectedValue,
      `${endpoint} should include ${header}: ${expectedValue}`,
    );
  }
}

async function classifyStartupFailure(
  error: unknown,
  child: ChildProcess | undefined,
): Promise<boolean> {
  if (child !== undefined && hasProcessExited(child) && !hasProcessClosed(child)) {
    const closed = await closesWithin(child, shutdownTimeoutMs);

    if (!closed) {
      return false;
    }
  }

  return isAddressInUse(error, child);
}

void test("startup diagnostics drain stderr before address conflict classification", async () => {
  const stderr = new EventEmitter();
  const child = Object.assign(new EventEmitter(), {
    exitCode: null,
    pid: undefined,
    signalCode: null,
    stderr,
    stdout: new EventEmitter(),
  }) as unknown as ChildProcess;

  trackChildProcess(child);

  child.emit("exit", 1, null);

  const classification = classifyStartupFailure(new Error("startup failed"), child);
  let settled = false;
  const result = classification.then((retryable) => {
    settled = true;

    return retryable;
  });

  stderr.emit("data", Buffer.from("listen EADDRINUSE: address already in use"));
  await Promise.resolve();
  assert.equal(settled, false, "classification must wait for stdio close after exit");

  child.emit("close", 1, null);

  assert.equal(await result, true);
  assert.equal(getProcessOutput(child), "listen EADDRINUSE: address already in use");
});

async function startProductionServerWithRetry(): Promise<{
  baseUrl: string;
  child: ChildProcess;
}> {
  let lastFailure: unknown;

  for (let attempt = 1; attempt <= startupAttempts; attempt += 1) {
    let child: ChildProcess | undefined;

    try {
      // Each retry must reserve a fresh loopback port before spawning the child.
      // eslint-disable-next-line no-await-in-loop
      const port = await reservePort();
      const baseUrl = `http://127.0.0.1:${String(port)}`;

      child = startProductionServer(port);

      // Startup must finish before this attempt can be accepted or retried.
      // eslint-disable-next-line no-await-in-loop
      await waitForServer(child, baseUrl);

      return { baseUrl, child };
    } catch (error: unknown) {
      lastFailure = error;

      // Drain bounded child diagnostics before classifying an address conflict.
      // eslint-disable-next-line no-await-in-loop
      const retryable = await classifyStartupFailure(error, child);

      // Reclaim this attempt before choosing whether to reserve another port.
      // eslint-disable-next-line no-await-in-loop
      await stopProductionServer(child);

      if (!retryable || attempt === startupAttempts) {
        throw error;
      }
    }
  }

  throw new Error(`Production server failed to start after ${String(startupAttempts)} attempts.`, {
    cause: lastFailure,
  });
}

void test(
  "production runtime enforces response policy and exposes only published content",
  { timeout: 180_000 },
  async () => {
    assert.equal(existsSync(outputEntry), true, "build output is missing; run pnpm build first");

    const server = await startProductionServerWithRetry();

    try {
      const { baseUrl } = server;

      const homepage = await readEndpoint(baseUrl, "/");

      assertSecurityHeaders(homepage.response, "/");

      const toolPage = await readEndpoint(baseUrl, "/tools/jd-skill-radar");

      assertSecurityHeaders(toolPage.response, "/tools/jd-skill-radar");

      const health = await readEndpoint(baseUrl, "/api/health");

      assertSecurityHeaders(health.response, "/api/health", { health: true });
      assert.equal(
        health.response.headers.get("content-type"),
        "application/json",
        "/api/health should return application/json",
      );
      assert.equal(
        health.body,
        exactHealthPayload,
        "/api/health should return exact liveness JSON",
      );

      const htmlNotFound = await readEndpoint(baseUrl, "/not-a-real-route", 404, {
        accept: "text/html",
      });

      assertSecurityHeaders(htmlNotFound.response, "/not-a-real-route (HTML)");

      const jsonNotFound = await readEndpoint(baseUrl, "/not-a-real-route", 404, {
        accept: "application/json",
      });

      assertJsonErrorSecurityHeaders(jsonNotFound.response, "/not-a-real-route (JSON)");

      const publicArticleMarkers = [
        "/articles/building-a-personal-lab",
        "构建个人主页与产品实验室",
      ];
      const publicWorkMarkers = ["/works/interview-notes", "前端面试知识库"];

      await Promise.all(
        (
          [
            ["articles", publicArticleMarkers],
            ["works", publicWorkMarkers],
          ] as const
        ).map(async ([collection, publicMarkers]) => {
          const encodedDump = await readEndpoint(
            baseUrl,
            `/__nuxt_content/${collection}/sql_dump.txt`,
          );
          const dump = decodeSqlDump(
            encodedDump.body,
            `/__nuxt_content/${collection}/sql_dump.txt`,
          );
          const query = await queryCollection(baseUrl, collection);

          assertNoDraftContent(dump, `${collection} SQL dump`);
          assertNoDraftContent(query, `${collection} query`);
          assertContainsMarkers(dump, publicMarkers, `${collection} SQL dump`);
          assertContainsMarkers(query, publicMarkers, `${collection} query`);
        }),
      );
    } finally {
      await stopProductionServer(server.child);
    }
  },
);

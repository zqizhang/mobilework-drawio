import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_CONTAINER = "openwork-drawio";
const DEFAULT_IMAGE = "jgraph/drawio:latest";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function defaultRun(command, args, timeout = 120_000) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    timeout,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  return { stdout, stderr };
}

function defaultLaunch(executable) {
  const child = spawn(executable, [], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

function windowsDockerCli(env) {
  const candidates = [
    env.OPENWORK_DOCKER_EXECUTABLE,
    env.ProgramFiles ? path.join(env.ProgramFiles, "Docker", "Docker", "resources", "bin", "docker.exe") : null,
    env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, "Docker", "resources", "bin", "docker.exe") : null,
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? "docker";
}

function windowsDockerDesktop(env) {
  const candidates = [
    env.ProgramFiles ? path.join(env.ProgramFiles, "Docker", "Docker", "Docker Desktop.exe") : null,
    env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, "Docker", "Docker Desktop.exe") : null,
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function createDrawioDockerManager({
  editorUrl = "http://127.0.0.1:18080/",
  platform = process.platform,
  env = process.env,
  run = defaultRun,
  fetcher = fetch,
  launch = defaultLaunch,
  pollDelay = delay,
  monitorIntervalMs = 15_000,
  containerName = env.OPENWORK_DRAWIO_DOCKER_CONTAINER || DEFAULT_CONTAINER,
  image = env.OPENWORK_DRAWIO_DOCKER_IMAGE || DEFAULT_IMAGE,
} = {}) {
  const target = new URL(editorUrl);
  const managed = (target.hostname === "127.0.0.1" || target.hostname === "localhost")
    && target.port === "18080"
    && env.OPENWORK_DRAWIO_DOCKER_MANAGED !== "0";
  let dockerExecutable = platform === "win32" ? windowsDockerCli(env) : (env.OPENWORK_DOCKER_EXECUTABLE || "docker");
  let state = {
    managed,
    status: managed ? "checking" : "external",
    editorUrl: target.toString(),
    containerName,
    image,
    error: null,
    checkedAt: null,
  };
  let ensurePromise = null;
  let monitor = null;

  function setState(status, error = null) {
    state = { ...state, status, error, checkedAt: new Date().toISOString() };
    return state;
  }

  async function healthy() {
    try {
      const response = await fetcher(target, { signal: AbortSignal.timeout(3_000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function docker(args, timeout) {
    return run(dockerExecutable, args, timeout);
  }

  async function dockerAvailable() {
    try {
      await docker(["version", "--format", "{{.Server.Version}}"], 10_000);
      return true;
    } catch {
      return false;
    }
  }

  async function installDocker() {
    if (platform !== "win32") throw new Error("Automatic Docker installation is currently supported on Windows only.");
    setState("installing");
    await run("winget", [
      "install", "--id", "Docker.DockerDesktop", "--exact", "--silent",
      "--accept-package-agreements", "--accept-source-agreements",
    ], 15 * 60_000);
    dockerExecutable = windowsDockerCli(env);
  }

  async function startDockerDesktop() {
    if (platform !== "win32") return;
    const executable = windowsDockerDesktop(env);
    if (!executable) return;
    setState("starting_docker");
    launch(executable);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (await dockerAvailable()) return;
      await pollDelay(2_000);
    }
  }

  async function ensureContainer() {
    let running = false;
    try {
      const result = await docker(["inspect", "--format", "{{.State.Running}}", containerName], 15_000);
      running = result.stdout.trim() === "true";
      if (!running) await docker(["start", containerName], 60_000);
    } catch {
      await docker([
        "run", "--detach", "--name", containerName, "--restart", "unless-stopped",
        "--publish", "127.0.0.1:18080:8080", image,
      ], 10 * 60_000);
    }
  }

  async function waitForEditor() {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (await healthy()) return true;
      await pollDelay(1_000);
    }
    return false;
  }

  async function ensureInternal({ install = false } = {}) {
    if (!managed) return setState("external");
    if (await healthy()) return setState("ready");
    setState("checking");
    if (!(await dockerAvailable())) {
      await startDockerDesktop();
    }
    if (!(await dockerAvailable())) {
      if (!install) return setState("docker_required", "Docker Desktop is not installed or its engine is unavailable.");
      await installDocker();
      await startDockerDesktop();
    }
    if (!(await dockerAvailable())) {
      return setState("restart_required", "Docker Desktop was installed but is not ready. Restart Windows or start Docker Desktop, then retry.");
    }
    try {
      setState("starting_container");
      await ensureContainer();
      return (await waitForEditor())
        ? setState("ready")
        : setState("unhealthy", "The Draw.io container started but its web editor did not become healthy.");
    } catch (error) {
      return setState("error", error.message);
    }
  }

  function ensure(options) {
    if (!ensurePromise) {
      ensurePromise = ensureInternal(options).finally(() => { ensurePromise = null; });
    }
    return ensurePromise;
  }

  function startMonitor() {
    if (!managed || monitor) return;
    monitor = setInterval(() => { void ensure({ install: false }); }, monitorIntervalMs);
    monitor.unref?.();
  }

  function stop() {
    if (monitor) clearInterval(monitor);
    monitor = null;
  }

  return { ensure, getState: () => state, startMonitor, stop };
}

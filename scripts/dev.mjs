import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT_DIR, "apps", "api");
const WEB_DIR = path.join(ROOT_DIR, "apps", "web");

const args = new Set(process.argv.slice(2));
const apiOnly = args.has("--api-only");
const webOnly = args.has("--web-only");
const isWin = process.platform === "win32";

function resolveApiPython() {
  const venvPy = isWin
    ? path.join(API_DIR, "venv", "Scripts", "python.exe")
    : path.join(API_DIR, "venv", "bin", "python");
  if (fs.existsSync(venvPy)) {
    return venvPy;
  }
  return isWin ? "python" : "python3";
}

function prefixOutput(stream, tag) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.length > 0) {
        process.stdout.write(`${tag} ${line}\n`);
      }
    }
  });
  stream.on("end", () => {
    if (buffer.length > 0) {
      process.stdout.write(`${tag} ${buffer}\n`);
    }
  });
}

const children = [];
let shuttingDown = false;

function killChildTree(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  if (isWin && child.pid) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    child.kill("SIGTERM");
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write("\n[DEV] Stopping servers...\n");
  for (const child of children) {
    killChildTree(child);
  }
  process.exit(code);
}

function startProcess(label, command, cmdArgs, cwd) {
  const child = spawn(command, cmdArgs, {
    cwd,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
    shell: isWin && command.endsWith(".cmd"),
  });

  children.push(child);
  if (child.stdout) prefixOutput(child.stdout, label);
  if (child.stderr) prefixOutput(child.stderr, label);

  child.on("error", (err) => {
    process.stderr.write(`${label} Failed to start: ${err.message}\n`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    process.stdout.write(
      `${label} Exited (${signal ?? `code ${code ?? 0}`}). Stopping remaining process...\n`
    );
    shutdown(code ?? 0);
  });

  return child;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (!webOnly) {
  const apiPython = resolveApiPython();
  process.stdout.write("[API] Starting FastAPI on http://127.0.0.1:8000\n");
  startProcess(
    "[API]",
    apiPython,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
    API_DIR
  );
}

if (!apiOnly) {
  const npmBin = isWin ? "npm.cmd" : "npm";
  process.stdout.write("[WEB] Starting Next.js on http://localhost:3000\n");
  startProcess("[WEB]", npmBin, ["run", "dev"], WEB_DIR);
}

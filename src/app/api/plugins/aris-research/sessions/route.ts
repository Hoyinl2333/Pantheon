import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const SESSIONS_DIR = path.join(os.homedir(), ".claude", "aris-sessions");
const SESSIONS_INDEX = path.join(SESSIONS_DIR, "sessions.json");

interface ArisSession {
  id: string;
  skill: string;
  command: string;
  pid: number | null;
  logFile: string;
  status: "running" | "completed" | "error" | "unknown";
  startedAt: string;
  endedAt: string | null;
}

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function readSessions(): ArisSession[] {
  ensureDir();
  if (!fs.existsSync(SESSIONS_INDEX)) return [];
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_INDEX, "utf-8"));
  } catch {
    return [];
  }
}

function writeSessions(sessions: ArisSession[]) {
  ensureDir();
  fs.writeFileSync(SESSIONS_INDEX, JSON.stringify(sessions, null, 2));
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** GET — list all sessions with live status check */
export async function GET() {
  const sessions = readSessions();

  // Update status for running sessions
  const updated = sessions.map((s) => {
    if (s.status === "running" && s.pid) {
      if (!isProcessRunning(s.pid)) {
        return { ...s, status: "completed" as const, endedAt: new Date().toISOString() };
      }
    }
    return s;
  });

  // Check if any status changed
  if (JSON.stringify(updated) !== JSON.stringify(sessions)) {
    writeSessions(updated);
  }

  return NextResponse.json({ sessions: updated });
}

/** POST — launch a new session */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { skill, command } = body as { skill: string; command: string };

  if (!command) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }

  ensureDir();

  const sessionId = `aris-${Date.now()}`;
  const logFile = path.join(SESSIONS_DIR, `${sessionId}.log`);

  // Find claude executable
  const claudePath = path.join(os.homedir(), ".local", "bin", "claude.exe");
  const claudeCmd = fs.existsSync(claudePath) ? claudePath : "claude";

  // Create the PowerShell script that runs claude with --print flag (non-interactive)
  const psScript = path.join(SESSIONS_DIR, `${sessionId}.ps1`);
  // Escape single quotes in command for PS
  const escapedCmd = command.replace(/'/g, "''");
  const escapedLogFile = logFile.replace(/\\/g, "\\\\");
  const escapedClaudePath = claudeCmd.replace(/\\/g, "\\\\");

  const psContent = `$ErrorActionPreference = 'Continue'
$logFile = '${escapedLogFile}'
$claudePath = '${escapedClaudePath}'

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting: ${command}" | Out-File -FilePath $logFile -Encoding utf8
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Skill: ${skill}" | Out-File -FilePath $logFile -Append -Encoding utf8
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Claude: $claudePath" | Out-File -FilePath $logFile -Append -Encoding utf8
"---" | Out-File -FilePath $logFile -Append -Encoding utf8

try {
  & $claudePath -p '${escapedCmd}' 2>&1 | ForEach-Object {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $_"
    $line | Out-File -FilePath $logFile -Append -Encoding utf8
    Write-Host $_
  }
  "" | Out-File -FilePath $logFile -Append -Encoding utf8
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] === SESSION COMPLETED ===" | Out-File -FilePath $logFile -Append -Encoding utf8
} catch {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $_" | Out-File -FilePath $logFile -Append -Encoding utf8
}

Start-Sleep -Seconds 2
`;

  fs.writeFileSync(psScript, psContent, "utf-8");

  // Launch in a new visible PowerShell window (survives browser close)
  const child = spawn("cmd.exe", [
    "/c", "start",
    `ARIS: ${skill}`,
    "powershell.exe",
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psScript,
  ], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  const session: ArisSession = {
    id: sessionId,
    skill,
    command,
    pid: child.pid ?? null,
    logFile,
    status: "running",
    startedAt: new Date().toISOString(),
    endedAt: null,
  };

  const sessions = readSessions();
  sessions.unshift(session);
  writeSessions(sessions);

  return NextResponse.json({ ok: true, session });
}

/** DELETE — remove a session record */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sessions = readSessions().filter((s) => s.id !== id);
  writeSessions(sessions);

  return NextResponse.json({ ok: true });
}

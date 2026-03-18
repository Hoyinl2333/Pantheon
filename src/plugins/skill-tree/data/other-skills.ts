/**
 * Skill Tree — Other Skills
 *
 * Miscellaneous: Docker, SSH, database, clipboard.
 */

import type { SkillTreeNode } from "../types";

export const OTHER_SKILLS: SkillTreeNode[] = [
  {
    id: "docker",
    name: "Docker",
    nameZh: "Docker 容器",
    description: "Container management and deployment",
    descriptionZh: "容器管理和部署",
    category: "other",
    defaultStatus: "configurable",
    icon: "Boxes",
    implType: "cli",
    dependencies: [],
    tier: 2,
    tags: ["devops", "container"],
    detectCommand: "docker --version",
    setupSteps: [
      "Windows: Install Docker Desktop from docker.com | Linux: sudo apt install docker.io (or snap install docker)",
      "Windows: Start Docker Desktop | Linux: sudo systemctl start docker",
      "Verify: docker --version",
    ],
    usageExample: "docker run hello-world (verify installation works)",
    usageExampleZh: "docker run hello-world（验证安装是否成功）",
  },
  {
    id: "ssh-remote",
    name: "SSH Remote",
    nameZh: "SSH 远程",
    description: "Remote server access for experiments",
    descriptionZh: "远程服务器访问（实验用）",
    category: "other",
    defaultStatus: "configurable",
    icon: "Globe",
    implType: "manual",
    dependencies: [],
    tier: 2,
    tags: ["remote", "server"],
    detectCommand: "ssh -V",
    setupSteps: [
      "Generate keys: ssh-keygen -t ed25519 (works on both Windows and Linux)",
      "Windows: Edit C:\\Users\\<you>\\.ssh\\config | Linux: Edit ~/.ssh/config",
      "Test connection: ssh <host> \"echo ok\"",
    ],
    detectHint: "Windows: Check C:\\Users\\<you>\\.ssh\\config | Linux: Check ~/.ssh/config",
    usageExample: "ssh <host> 'nvidia-smi' — check GPU status on remote server",
    usageExampleZh: "ssh <host> 'nvidia-smi' — 检查远程服务器 GPU 状态",
  },
  {
    id: "database",
    name: "Database",
    nameZh: "数据库",
    description: "Database management (SQLite, PostgreSQL)",
    descriptionZh: "数据库管理（SQLite、PostgreSQL）",
    category: "other",
    defaultStatus: "planned",
    icon: "Database",
    implType: "planned",
    dependencies: [],
    tier: 3,
    tags: ["data", "sql"],
  },
  {
    id: "clipboard-sync",
    name: "Clipboard Sync",
    nameZh: "剪贴板同步",
    description: "Cross-device clipboard sharing",
    descriptionZh: "跨设备剪贴板共享",
    category: "other",
    defaultStatus: "planned",
    icon: "Clipboard",
    implType: "planned",
    dependencies: [],
    tier: 4,
    tags: ["utility", "sync"],
  },
];

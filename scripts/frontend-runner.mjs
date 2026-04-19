#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const command = args[0] || "dev";

const portArg = args.find((value) => value.startsWith("--port="));
const parsedPort = portArg ? portArg.split("=")[1] : process.env.PORT || "3000";

const npmArgs =
  command === "build"
    ? ["run", "build"]
    : command === "start"
      ? ["run", "start", "--", "-p", parsedPort]
      : ["run", "dev", "--", "-p", parsedPort];

const child = spawn("npm", npmArgs, {
  cwd: new URL("../apps/frontend", import.meta.url),
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

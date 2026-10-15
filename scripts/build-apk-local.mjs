import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { androidBuildCommand } from "./android-build-command.cjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const androidDir = path.join(projectRoot, "android");
const isWindows = process.platform === "win32";
const wrapper = path.join(androidDir, isWindows ? "gradlew.bat" : "gradlew");
const apkPath = path.join(androidDir, "app/build/outputs/apk/release/app-release.apk");

if (!existsSync(wrapper)) {
  console.error("Android project not found. Run npx expo prebuild --platform android first.");
  process.exit(1);
}

const buildStarted = Date.now();
const command = androidBuildCommand(wrapper);
const result = spawnSync(
  command.file,
  command.args,
  {
    ...command.options,
    cwd: androidDir,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "production" },
  },
);

if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status || 1);
if (!existsSync(apkPath)) {
  console.error(`Gradle finished without producing the expected APK: ${apkPath}`);
  process.exit(1);
}

const apk = statSync(apkPath);
console.log(`APK: ${apkPath}`);
console.log(`Size: ${(apk.size / 1024 / 1024).toFixed(1)} MiB`);
if (apk.mtimeMs < buildStarted) console.log("Gradle reused an up-to-date APK.");

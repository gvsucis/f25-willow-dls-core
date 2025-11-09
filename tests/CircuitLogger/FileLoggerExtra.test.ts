import { test, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

import { FileLogger } from "../../src/CircuitLogger/FileLogger";
import { LogLevel } from "../../src/CircuitLogger";

const TMP_DIR = path.join(__dirname, "..", "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

test("FileLogger writes output and can be closed", async () => {
  ensureTmp();
  const file = path.join(TMP_DIR, "filelogger1.log");
  if (fs.existsSync(file)) fs.unlinkSync(file);

  const logger = new FileLogger(file);

  logger.output(1, new Date(0), LogLevel.INFO, "Test", "hello world");
  logger.output(2, new Date(0), LogLevel.DEBUG, "Test", "withdata", { k: "v" });

  await logger.close();

  const content = fs.readFileSync(file, "utf8");
  expect(content).toContain("hello world");
  expect(content).toContain("withdata");
  expect(content).toContain('k: "v"');

  // cleanup
  fs.unlinkSync(file);
  try {
    fs.rmdirSync(TMP_DIR);
  } catch (e) {
    // ignore if not empty or already removed by other tests
  }
});

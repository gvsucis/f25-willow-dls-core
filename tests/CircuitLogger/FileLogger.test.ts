import { test, expect } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { FileLogger } from "../../src/CircuitLogger/FileLogger";
import { LogLevel } from "../../src/CircuitLogger";

test("FileLogger writes header, message and data to provided stream and closes", async () => {
  const tmp = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
  const stream = fs.createWriteStream(tmp);

  const logger = new FileLogger(stream);

  const ts = new Date("2000-01-01T00:00:00Z");
  logger.output(2, ts, LogLevel.DEBUG, "FSSub", "file message", { foo: "bar" });

  await logger.close();

  const contents = fs.readFileSync(tmp, { encoding: "utf8" });
  expect(contents).toContain("FSSub");
  expect(contents).toContain("file message");
  expect(contents).toContain("foo");
  expect(contents).toContain("bar");

  // cleanup
  fs.unlinkSync(tmp);
});

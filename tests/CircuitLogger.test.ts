import { CircuitLogger, CircuitLoggable, LogLevel, logLevelString } from "../src/CircuitLogger";

class TestLogger extends CircuitLogger {
  public records: Array<{
    count: number;
    timestamp: Date;
    level: LogLevel;
    subsystem: string;
    msg: string;
    data?: any;
  }> = [];

  output(count: number, timestamp: Date, level: LogLevel, subsystem: string, msg: string, data?: any): void {
    this.records.push({ count, timestamp, level, subsystem, msg, data });
  }
}

describe("CircuitLogger / CircuitLoggable", () => {
  test("logLevelString maps indices to human strings", () => {
    expect(logLevelString[LogLevel.TRACE]).toBe("TRACE");
    expect(logLevelString[LogLevel.WARN]).toBe("WARNING");
    expect(logLevelString[LogLevel.FATAL]).toBe("FATAL");
  });

  test("default level filters out lower levels and setLevel changes behavior", () => {
    const logger = new TestLogger();
    const lg = new (class extends CircuitLoggable { })();

    // Attach logger to loggable
    lg.attachLogger(logger);

    // Default logger level is WARN so INFO should not be recorded
    lg["log"](LogLevel.INFO, "info-message");
    expect(logger.records.length).toBe(0);

    // WARN should be recorded
    lg["log"](LogLevel.WARN, "warn-message");
    expect(logger.records.length).toBe(1);
    expect(logger.records[0].msg).toBe("warn-message");

    // Change to TRACE and log TRACE
    logger.setLevel(LogLevel.TRACE);
    lg["log"](LogLevel.TRACE, "trace-message");
    expect(logger.records.length).toBe(2);
    expect(logger.records[1].msg).toBe("trace-message");
  });

  test("subsystem filtering works via setSubsystems", () => {
    const logger = new TestLogger();
    logger.setLevel(LogLevel.TRACE);

    // Only allow subsystems that start with 'Match'
    logger.setSubsystems(/^Match/);

    const matching = new (class extends CircuitLoggable { constructor() { super("MatchThis"); } })();
    const nonMatching = new (class extends CircuitLoggable { constructor() { super("Other"); } })();

    matching.attachLogger(logger);
    nonMatching.attachLogger(logger);

    matching["log"](LogLevel.INFO, "ok");
    nonMatching["log"](LogLevel.INFO, "nope");

    expect(logger.records.some((r) => r.msg === "ok")).toBe(true);
    expect(logger.records.some((r) => r.msg === "nope")).toBe(false);
  });

  test("attachTo / detachFrom and attachLogger / detachLogger symmetric behavior", () => {
    const logger = new TestLogger();
    const lg = new (class extends CircuitLoggable { constructor() { super("Sys"); } })();

    // attachTo returns the logger and attaches
    expect(logger.attachTo(lg)).toBe(logger);
    lg["log"](LogLevel.WARN, "a");
    expect(logger.records.length).toBe(1);

    // detach should remove it
    expect(logger.detachFrom(lg)).toBe(logger);
    lg["log"](LogLevel.WARN, "b");
    expect(logger.records.length).toBe(1);
  });

  test("propagateLoggersTo propagates existing loggers to children", () => {
    const parent = new (class extends CircuitLoggable { constructor() { super("P"); } })();
    const child = new (class extends CircuitLoggable { constructor() { super("C"); } })();
    const logger = new TestLogger();
    logger.setLevel(LogLevel.TRACE);

    parent.attachLogger(logger);
    parent.propagateLoggersTo(child);

    // logging on the child should reach the parent's logger
    child["log"](LogLevel.INFO, "child-msg");
    expect(logger.records.length).toBe(1);
    expect(logger.records[0].subsystem).toBe("C");
  });

  test("getId returns unique string ids", () => {
    const a = new (class extends CircuitLoggable { })();
    const b = new (class extends CircuitLoggable { })();
    expect(a.getId()).not.toBe(b.getId());
    // ids are numeric strings
    expect(typeof a.getId()).toBe("string");
    expect(/^[0-9]+$/.test(a.getId())).toBe(true);
  });
});

export { };

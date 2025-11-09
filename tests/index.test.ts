import * as idx from "../src/index";

describe("index.ts exports", () => {
  it("exports core types and elements", () => {
    expect(idx.BitString).toBeDefined();
    expect(idx.Circuit).toBeDefined();
    expect(idx.DFlipFlop).toBeDefined();
    expect(idx.JKFlipFlop).toBeDefined();
    expect(idx.TFlipFlop).toBeDefined();
    expect(idx.SRFlipFlop).toBeDefined();
    expect(idx.ConsoleLogger).toBeDefined();
    expect(idx.FileLogger).toBeDefined();
  });
});

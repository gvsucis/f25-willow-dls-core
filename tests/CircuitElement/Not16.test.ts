import { BitString } from "../../src/BitString";
import { Not16 } from "../../src/CircuitElement/Not16";

describe("Not16", () => {
  test("NOT 0x0000 = 0xFFFF", () => {
    const result = new Not16([], []).evaluate(
      BitString.low(16),
      new BitString("0x0000", 16)
    );
    expect(result.toUnsigned()).toBe(65535);
  });

  test("NOT 0xFFFF = 0x0000", () => {
    const result = new Not16([], []).evaluate(
      BitString.low(16),
      new BitString("0xFFFF", 16)
    );
    expect(result.toUnsigned()).toBe(0);
  });

  test("NOT 0x00FF = 0xFF00", () => {
    const result = new Not16([], []).evaluate(
      BitString.low(16),
      new BitString("0x00FF", 16)
    );
    expect(result.toUnsigned()).toBe(0xFF00);
  });

  test("NOT 0xAAAA = 0x5555", () => {
    const result = new Not16([], []).evaluate(
      BitString.low(16),
      new BitString("0xAAAA", 16)
    );
    expect(result.toUnsigned()).toBe(0x5555);
  });
});

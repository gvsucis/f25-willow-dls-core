import { BitString } from "../../src/BitString";
import { And16 } from "../../src/CircuitElement/And16";

describe("And16", () => {
  test("0xFFFF AND 0xFFFF = 0xFFFF", () => {
    const result = new And16([], []).evaluate(
      new BitString("0xFFFF", 16),
      new BitString("0xFFFF", 16)
    );
    expect(result.toUnsigned()).toBe(0xFFFF);
  });

  test("0xFFFF AND 0x0000 = 0x0000", () => {
    const result = new And16([], []).evaluate(
      new BitString("0xFFFF", 16),
      new BitString("0x0000", 16)
    );
    expect(result.toUnsigned()).toBe(0);
  });

  test("0xFF00 AND 0x00FF = 0x0000", () => {
    const result = new And16([], []).evaluate(
      new BitString("0xFF00", 16),
      new BitString("0x00FF", 16)
    );
    expect(result.toUnsigned()).toBe(0);
  });

  test("0xAAAA AND 0x5555 = 0x0000", () => {
    const result = new And16([], []).evaluate(
      new BitString("0xAAAA", 16),
      new BitString("0x5555", 16)
    );
    expect(result.toUnsigned()).toBe(0);
  });

  test("0xAAAA AND 0xFFFF = 0xAAAA", () => {
    const result = new And16([], []).evaluate(
      new BitString("0xAAAA", 16),
      new BitString("0xFFFF", 16)
    );
    expect(result.toUnsigned()).toBe(0xAAAA);
  });
});

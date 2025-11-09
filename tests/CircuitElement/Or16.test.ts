import { BitString } from "../../src/BitString";
import { Or16 } from "../../src/CircuitElement/Or16";

describe("Or16", () => {
  test("0x0000 OR 0x0000 = 0x0000", () => {
    const result = new Or16([], []).evaluate(
      new BitString("0x0000", 16),
      new BitString("0x0000", 16)
    );
    expect(result.toUnsigned()).toBe(0);
  });

  test("0xFFFF OR 0x0000 = 0xFFFF", () => {
    const result = new Or16([], []).evaluate(
      new BitString("0xFFFF", 16),
      new BitString("0x0000", 16)
    );
    expect(result.toUnsigned()).toBe(0xFFFF);
  });

  test("0xFF00 OR 0x00FF = 0xFFFF", () => {
    const result = new Or16([], []).evaluate(
      new BitString("0xFF00", 16),
      new BitString("0x00FF", 16)
    );
    expect(result.toUnsigned()).toBe(0xFFFF);
  });

  test("0xAAAA OR 0x5555 = 0xFFFF", () => {
    const result = new Or16([], []).evaluate(
      new BitString("0xAAAA", 16),
      new BitString("0x5555", 16)
    );
    expect(result.toUnsigned()).toBe(0xFFFF);
  });

  test("0x1234 OR 0x5678 = 0x567C", () => {
    const result = new Or16([], []).evaluate(
      new BitString("0x1234", 16),
      new BitString("0x5678", 16)
    );
    expect(result.toUnsigned()).toBe(0x567C);
  });
});

import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";
import { DMux4Way } from "../../src/CircuitElement/DMux4Way";

describe("DMux4Way", () => {
  test("sel=0 routes to output a", () => {
    const input = new CircuitBus(1);
    const a = new CircuitBus(1);
    const b = new CircuitBus(1);
    const c = new CircuitBus(1);
    const d = new CircuitBus(1);
    const selector = new CircuitBus(2);

    input.setValue(new BitString("1"));
    selector.setValue(new BitString((0).toString(2), 2));

    const dmux = new DMux4Way(input, a, b, c, d, selector);
    dmux.resolve();

    expect(a.getValue()?.toString()).toBe("1");
    expect(b.getValue()?.toString()).toBe("0");
    expect(c.getValue()?.toString()).toBe("0");
    expect(d.getValue()?.toString()).toBe("0");
  });

  test("sel=1 routes to output b", () => {
    const input = new CircuitBus(1);
    const a = new CircuitBus(1);
    const b = new CircuitBus(1);
    const c = new CircuitBus(1);
    const d = new CircuitBus(1);
    const selector = new CircuitBus(2);

    input.setValue(new BitString("1"));
    selector.setValue(new BitString((1).toString(2), 2));

    const dmux = new DMux4Way(input, a, b, c, d, selector);
    dmux.resolve();

    expect(a.getValue()?.toString()).toBe("0");
    expect(b.getValue()?.toString()).toBe("1");
    expect(c.getValue()?.toString()).toBe("0");
    expect(d.getValue()?.toString()).toBe("0");
  });

  test("sel=2 routes to output c", () => {
    const input = new CircuitBus(1);
    const a = new CircuitBus(1);
    const b = new CircuitBus(1);
    const c = new CircuitBus(1);
    const d = new CircuitBus(1);
    const selector = new CircuitBus(2);

    input.setValue(new BitString("1"));
    selector.setValue(new BitString((2).toString(2), 2));

    const dmux = new DMux4Way(input, a, b, c, d, selector);
    dmux.resolve();

    expect(a.getValue()?.toString()).toBe("0");
    expect(b.getValue()?.toString()).toBe("0");
    expect(c.getValue()?.toString()).toBe("1");
    expect(d.getValue()?.toString()).toBe("0");
  });

  test("sel=3 routes to output d", () => {
    const input = new CircuitBus(1);
    const a = new CircuitBus(1);
    const b = new CircuitBus(1);
    const c = new CircuitBus(1);
    const d = new CircuitBus(1);
    const selector = new CircuitBus(2);

    input.setValue(new BitString("1"));
    selector.setValue(new BitString((3).toString(2), 2));

    const dmux = new DMux4Way(input, a, b, c, d, selector);
    dmux.resolve();

    expect(a.getValue()?.toString()).toBe("0");
    expect(b.getValue()?.toString()).toBe("0");
    expect(c.getValue()?.toString()).toBe("0");
    expect(d.getValue()?.toString()).toBe("1");
  });
});

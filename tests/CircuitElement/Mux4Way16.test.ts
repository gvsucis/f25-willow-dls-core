import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";
import { Mux4Way16 } from "../../src/CircuitElement/Mux4Way16";

describe("Mux4Way16", () => {
  test("sel=0 selects input a", () => {
    const a = new CircuitBus(16);
    const b = new CircuitBus(16);
    const c = new CircuitBus(16);
    const d = new CircuitBus(16);
    const output = new CircuitBus(16);
    const selector = new CircuitBus(2);

    a.setValue(new BitString((1111).toString(2), 16));
    b.setValue(new BitString((2222).toString(2), 16));
    c.setValue(new BitString((3333).toString(2), 16));
    d.setValue(new BitString((4444).toString(2), 16));
    selector.setValue(new BitString((0).toString(2), 2));

    const mux = new Mux4Way16(a, b, c, d, output, selector);
    mux.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(1111);
  });

  test("sel=1 selects input b", () => {
    const a = new CircuitBus(16);
    const b = new CircuitBus(16);
    const c = new CircuitBus(16);
    const d = new CircuitBus(16);
    const output = new CircuitBus(16);
    const selector = new CircuitBus(2);

    a.setValue(new BitString((1111).toString(2), 16));
    b.setValue(new BitString((2222).toString(2), 16));
    c.setValue(new BitString((3333).toString(2), 16));
    d.setValue(new BitString((4444).toString(2), 16));
    selector.setValue(new BitString((1).toString(2), 2));

    const mux = new Mux4Way16(a, b, c, d, output, selector);
    mux.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(2222);
  });

  test("sel=2 selects input c", () => {
    const a = new CircuitBus(16);
    const b = new CircuitBus(16);
    const c = new CircuitBus(16);
    const d = new CircuitBus(16);
    const output = new CircuitBus(16);
    const selector = new CircuitBus(2);

    a.setValue(new BitString((1111).toString(2), 16));
    b.setValue(new BitString((2222).toString(2), 16));
    c.setValue(new BitString((3333).toString(2), 16));
    d.setValue(new BitString((4444).toString(2), 16));
    selector.setValue(new BitString((2).toString(2), 2));

    const mux = new Mux4Way16(a, b, c, d, output, selector);
    mux.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(3333);
  });

  test("sel=3 selects input d", () => {
    const a = new CircuitBus(16);
    const b = new CircuitBus(16);
    const c = new CircuitBus(16);
    const d = new CircuitBus(16);
    const output = new CircuitBus(16);
    const selector = new CircuitBus(2);

    a.setValue(new BitString((1111).toString(2), 16));
    b.setValue(new BitString((2222).toString(2), 16));
    c.setValue(new BitString((3333).toString(2), 16));
    d.setValue(new BitString((4444).toString(2), 16));
    selector.setValue(new BitString((3).toString(2), 2));

    const mux = new Mux4Way16(a, b, c, d, output, selector);
    mux.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(4444);
  });
});

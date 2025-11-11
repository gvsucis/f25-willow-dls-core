import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";
import { Nand2TetrisALU } from "../../src/CircuitElement/Nand2TetrisALU";

describe("Nand2TetrisALU", () => {
  function createALU() {
    const x = new CircuitBus(16);
    const y = new CircuitBus(16);
    const zx = new CircuitBus(1);
    const nx = new CircuitBus(1);
    const zy = new CircuitBus(1);
    const ny = new CircuitBus(1);
    const f = new CircuitBus(1);
    const no = new CircuitBus(1);
    const out = new CircuitBus(16);
    const zr = new CircuitBus(1);
    const ng = new CircuitBus(1);

    const alu = new Nand2TetrisALU(x, y, zx, nx, zy, ny, f, no, out, zr, ng);

    return { x, y, zx, nx, zy, ny, f, no, out, zr, ng, alu };
  }

  test("Compute 0 (zx=1, nx=0, zy=1, ny=0, f=1, no=0)", () => {
    const { x, y, zx, nx, zy, ny, f, no, out, zr, ng, alu } = createALU();

    x.setValue(new BitString((12345).toString(2), 16));
    y.setValue(new BitString((6789).toString(2), 16));
    zx.setValue(new BitString("1"));
    nx.setValue(new BitString("0"));
    zy.setValue(new BitString("1"));
    ny.setValue(new BitString("0"));
    f.setValue(new BitString("1"));
    no.setValue(new BitString("0"));

    alu.resolve();

    expect(out.getValue()?.toUnsigned()).toBe(0);
    expect(zr.getValue()?.toString()).toBe("1"); // out == 0
    expect(ng.getValue()?.toString()).toBe("0"); // out >= 0
  });

  test("Compute 1 (zx=1, nx=1, zy=1, ny=1, f=1, no=1)", () => {
    const { x, y, zx, nx, zy, ny, f, no, out, zr, ng, alu } = createALU();

    x.setValue(new BitString((0).toString(2), 16));
    y.setValue(new BitString((0).toString(2), 16));
    zx.setValue(new BitString("1"));
    nx.setValue(new BitString("1"));
    zy.setValue(new BitString("1"));
    ny.setValue(new BitString("1"));
    f.setValue(new BitString("1"));
    no.setValue(new BitString("1"));

    alu.resolve();

    expect(out.getValue()?.toUnsigned()).toBe(1);
    expect(zr.getValue()?.toString()).toBe("0");
    expect(ng.getValue()?.toString()).toBe("0");
  });

  test("Compute -1 (zx=1, nx=1, zy=1, ny=0, f=1, no=0)", () => {
    const { x, y, zx, nx, zy, ny, f, no, out, zr, ng, alu } = createALU();

    x.setValue(new BitString((0).toString(2), 16));
    y.setValue(new BitString((0).toString(2), 16));
    zx.setValue(new BitString("1"));
    nx.setValue(new BitString("1"));
    zy.setValue(new BitString("1"));
    ny.setValue(new BitString("0"));
    f.setValue(new BitString("1"));
    no.setValue(new BitString("0"));

    alu.resolve();

    expect(out.getValue()?.toUnsigned()).toBe(65535); // -1 in 16-bit 2's complement
    expect(zr.getValue()?.toString()).toBe("0");
    expect(ng.getValue()?.toString()).toBe("1"); // negative
  });

  test("Compute x (zx=0, nx=0, zy=1, ny=1, f=0, no=0)", () => {
    const { x, y, zx, nx, zy, ny, f, no, out, zr, ng, alu } = createALU();

    x.setValue(new BitString((42).toString(2), 16));
    y.setValue(new BitString((99).toString(2), 16));
    zx.setValue(new BitString("0"));
    nx.setValue(new BitString("0"));
    zy.setValue(new BitString("1"));
    ny.setValue(new BitString("1"));
    f.setValue(new BitString("0"));
    no.setValue(new BitString("0"));

    alu.resolve();

    expect(out.getValue()?.toUnsigned()).toBe(42);
    expect(zr.getValue()?.toString()).toBe("0");
    expect(ng.getValue()?.toString()).toBe("0");
  });

  test("Compute x + y (zx=0, nx=0, zy=0, ny=0, f=1, no=0)", () => {
    const { x, y, zx, nx, zy, ny, f, no, out, zr, ng, alu } = createALU();

    x.setValue(new BitString((10).toString(2), 16));
    y.setValue(new BitString((20).toString(2), 16));
    zx.setValue(new BitString("0"));
    nx.setValue(new BitString("0"));
    zy.setValue(new BitString("0"));
    ny.setValue(new BitString("0"));
    f.setValue(new BitString("1"));
    no.setValue(new BitString("0"));

    alu.resolve();

    expect(out.getValue()?.toUnsigned()).toBe(30);
    expect(zr.getValue()?.toString()).toBe("0");
    expect(ng.getValue()?.toString()).toBe("0");
  });

  test("Compute x & y (zx=0, nx=0, zy=0, ny=0, f=0, no=0)", () => {
    const { x, y, zx, nx, zy, ny, f, no, out, zr, ng, alu } = createALU();

    x.setValue(new BitString((0b1111).toString(2), 16));
    y.setValue(new BitString((0b1010).toString(2), 16));
    zx.setValue(new BitString("0"));
    nx.setValue(new BitString("0"));
    zy.setValue(new BitString("0"));
    ny.setValue(new BitString("0"));
    f.setValue(new BitString("0"));
    no.setValue(new BitString("0"));

    alu.resolve();

    expect(out.getValue()?.toUnsigned()).toBe(0b1010);
    expect(zr.getValue()?.toString()).toBe("0");
    expect(ng.getValue()?.toString()).toBe("0");
  });
});

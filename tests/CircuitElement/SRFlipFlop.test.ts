import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { SRFlipFlop } from "../../src/CircuitElement/SRFlipFlop";

describe("SRFlipFlop behavior", () => {
  it("initialize sets q and qInv correctly", () => {
    const s = new CircuitBus(1);
    const r = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const sr = new SRFlipFlop(s, r, q, qInv, reset, preset, enable);

    sr.initialize(BitString.high());

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });

  it("S=1,R=0 sets Q high when enabled", () => {
    const s = new CircuitBus(1);
    const r = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const sr = new SRFlipFlop(s, r, q, qInv, reset, preset, enable);

    enable.setValue(BitString.high());
    s.setValue(BitString.high());
    r.setValue(BitString.low());

    sr.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
  });

  it("S=0,R=1 sets Q low when enabled", () => {
    const s = new CircuitBus(1);
    const r = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const sr = new SRFlipFlop(s, r, q, qInv, reset, preset, enable);

    enable.setValue(BitString.high());
    s.setValue(BitString.low());
    r.setValue(BitString.high());

    sr.resolve();

    expect(q.getValue()?.equals(BitString.low())).toBeTruthy();
  });

  it("S=1,R=1 leaves Q unchanged", () => {
    const s = new CircuitBus(1);
    const r = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const sr = new SRFlipFlop(s, r, q, qInv, reset, preset, enable);

    // start with q low
    sr.initialize(BitString.low());

    enable.setValue(BitString.high());
    s.setValue(BitString.high());
    r.setValue(BitString.high());

    sr.resolve();

    // unchanged: still low
    expect(q.getValue()?.equals(BitString.low())).toBeTruthy();
  });

  it("reset forces q to preset", () => {
    const s = new CircuitBus(1);
    const r = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const sr = new SRFlipFlop(s, r, q, qInv, reset, preset, enable);

    preset.setValue(BitString.high());
    reset.setValue(BitString.high());

    sr.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
  });
});

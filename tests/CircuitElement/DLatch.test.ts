import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { DLatch } from "../../src/CircuitElement/DLatch";

describe("DLatch behavior", () => {
  it("initialize sets q and qInv correctly", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);

    const latch = new DLatch(clock, d, q, qInv);

    latch.initialize(BitString.high());

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });

  it("onClockRise sets q and qInv to not(d) (current implementation)", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);

    const latch = new DLatch(clock, d, q, qInv);

    // d high -> not(d) = low
    d.setValue(BitString.high());

    clock.setValue(BitString.low());
    latch.resolve();
    clock.setValue(BitString.high());
    latch.resolve();

    expect(q.getValue()?.equals(BitString.high().not())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });
});

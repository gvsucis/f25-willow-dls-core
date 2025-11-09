import { BitString } from "../BitString";
import { CircuitBus } from "../CircuitBus";
import { Memory } from "./Memory";

export class CircuitVerseRAM extends Memory {
  constructor(
    address: CircuitBus,
    input: CircuitBus,
    write: CircuitBus,
    reset: CircuitBus,
    output: CircuitBus,
    size: number,
    wordSize: number,
    initialData: BitString[],
  ) {
    super(
      "RAMElement",
      [address, input, write, reset],
      [output],
      size,
      wordSize,
      initialData,
    );
  }

  resolve(): number {
    const [address, input, write, reset] = this.getInputs();
    const [output] = this.getOutputs();

    if (BitString.high().equals(reset.getValue())) {
      this.data = this.data.fill(BitString.low(this.wordSize));
      output.setValue(BitString.low(this.wordSize));
    } else {
      const idx = address.getValue()?.toUnsigned();
      if (idx !== undefined && idx !== null) {
        if (BitString.high().equals(write.getValue())) {
          if (idx < this.data.length) {
            this.data[idx] = input.getValue() ?? BitString.low(this.wordSize);
          }
        }

        if (idx < this.data.length) {
          output.setValue(this.data[idx]);
        }
      }
    }

    return this.getPropagationDelay();
  }
}

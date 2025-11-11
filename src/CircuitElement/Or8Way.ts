import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * 8-way Or gate for nand2tetris.
 *
 * Outputs 1 if any of the 8 input bits is 1, otherwise outputs 0.
 *
 * Inputs: in[8]
 * Outputs: out (1 bit)
 * Function: out = in[0] OR in[1] OR ... OR in[7]
 */
export class Or8Way extends CircuitElement {
  constructor(
    input: CircuitBus,
    output: CircuitBus
  ) {
    super("Or8WayElement", [input], [output]);
  }

  resolve(): number {
    const [input] = this.getInputs();
    const [output] = this.getOutputs();

    const inputVal = input.getValue();

    if (!inputVal) {
      output.setValue(BitString.low(1));
      return this.getPropagationDelay();
    }

    // Check if any bit is 1
    // If the value is non-zero, at least one bit is set
    const result = inputVal.toUnsigned() !== 0 ? "1" : "0";

    output.setValue(new BitString(result, 1));

    return this.getPropagationDelay();
  }
}

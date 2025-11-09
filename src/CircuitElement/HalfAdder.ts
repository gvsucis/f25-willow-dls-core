import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * Half Adder for nand2tetris.
 *
 * Adds two 1-bit values.
 *
 * Inputs: a, b (1 bit each)
 * Outputs: sum, carry
 * Function: sum = LSB of a + b, carry = MSB of a + b
 */
export class HalfAdder extends CircuitElement {
  constructor(
    a: CircuitBus,
    b: CircuitBus,
    sum: CircuitBus,
    carry: CircuitBus
  ) {
    super("HalfAdderElement", [a, b], [sum, carry]);
  }

  resolve(): number {
    const [a, b] = this.getInputs();
    const [sum, carry] = this.getOutputs();

    const aVal = a.getValue()?.toUnsigned() ?? 0;
    const bVal = b.getValue()?.toUnsigned() ?? 0;

    const result = aVal + bVal;

    // sum is the LSB (result & 1)
    sum.setValue(new BitString((result & 1).toString(2), 1));

    // carry is the MSB (result >> 1)
    carry.setValue(new BitString((result >> 1).toString(2), 1));

    return this.getPropagationDelay();
  }
}

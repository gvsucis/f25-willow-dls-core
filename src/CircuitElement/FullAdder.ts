import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * Full Adder for nand2tetris.
 *
 * Adds three 1-bit values.
 *
 * Inputs: a, b, c (1 bit each)
 * Outputs: sum, carry
 * Function: sum = LSB of a + b + c, carry = MSB of a + b + c
 */
export class FullAdder extends CircuitElement {
  constructor(
    a: CircuitBus,
    b: CircuitBus,
    c: CircuitBus,
    sum: CircuitBus,
    carry: CircuitBus
  ) {
    super("FullAdderElement", [a, b, c], [sum, carry]);
  }

  resolve(): number {
    const [a, b, c] = this.getInputs();
    const [sum, carry] = this.getOutputs();

    const aVal = a.getValue()?.toUnsigned() ?? 0;
    const bVal = b.getValue()?.toUnsigned() ?? 0;
    const cVal = c.getValue()?.toUnsigned() ?? 0;

    const result = aVal + bVal + cVal;

    // sum is the LSB (result & 1)
    sum.setValue(new BitString((result & 1).toString(2), 1));

    // carry is the MSB (result >> 1)
    carry.setValue(new BitString((result >> 1).toString(2), 1));

    return this.getPropagationDelay();
  }
}

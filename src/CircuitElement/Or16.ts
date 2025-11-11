import { BitString } from "../BitString";
import { LogLevel } from "../CircuitLogger";
import { Gate } from "./Gate";

/**
 * A 16-bit OR gate (bitwise OR).
 *
 * In nand2tetris, Or16 takes two 16-bit inputs and produces a 16-bit output
 * where each bit is the OR of the corresponding bits in the inputs.
 *
 * Input: a[16], b[16]
 * Output: out[16]
 * Function: for i=0..15: out[i] = OR(a[i], b[i])
 */
export class Or16 extends Gate {
  evaluate(previousValue: BitString, currentValue: BitString): BitString {
    // For Or16, we only care about the current value (single input gate)
    // The gate automatically inverts all bits in the BitString
    const result = currentValue.or(previousValue);
    this.log(
      LogLevel.TRACE,
      `OR16 a=${previousValue.toString()}, b=${currentValue.toString()} => ${result.toString()}`
    );
    return result;
  }
}

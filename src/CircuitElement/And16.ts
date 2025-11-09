import { BitString } from "../BitString";
import { LogLevel } from "../CircuitLogger";
import { Gate } from "./Gate";

/**
 * A 16-bit AND gate (bitwise AND).
 *
 * In nand2tetris, And16 takes two 16-bit inputs and produces a 16-bit output
 * where each bit is the AND of the corresponding bits in the inputs.
 *
 * Input: a[16], b[16]
 * Output: out[16]
 * Function: for i=0..15: out[i] = AND(a[i], b[i])
 */
export class And16 extends Gate {
  evaluate(a: BitString, b: BitString): BitString {
    const result = a.and(b);
    this.log(
      LogLevel.TRACE,
      `AND16 a=${a.toString()}, b=${b.toString()} => ${result.toString()}`
    );
    return result;
  }
}

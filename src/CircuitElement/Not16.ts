import { BitString } from "../BitString";
import { LogLevel } from "../CircuitLogger";
import { Gate } from "./Gate";

/**
 * A 16-bit NOT gate (bitwise inverter).
 *
 * In nand2tetris, Not16 takes a 16-bit input and produces a 16-bit output
 * where each bit is inverted independently.
 *
 * Input: in[16]
 * Output: out[16]
 * Function: for i=0..15: out[i] = NOT in[i]
 */
export class Not16 extends Gate {
  evaluate(previousValue: BitString, currentValue: BitString): BitString {
    // For Not16, we only care about the current value (single input gate)
    // The gate automatically inverts all bits in the BitString
    const result = currentValue.not();
    this.log(
      LogLevel.TRACE,
      `NOT16 ${currentValue.toString()} => ${result.toString()}`
    );
    return result;
  }
}

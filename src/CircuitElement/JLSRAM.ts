import { BitString } from "../BitString";
import { CircuitBus } from "../CircuitBus";
import { LogLevel } from "../CircuitLogger";
import { Memory } from "./Memory";

export class JLSRAM extends Memory {
  constructor(
    address: CircuitBus,
    data: CircuitBus,
    output: CircuitBus,
    enable: CircuitBus,
    chipSelect: CircuitBus,
    writeEnable: CircuitBus,
    size: number,
    wordSize: number,
    initialData: BitString[],
  ) {
    super(
      "JLSRAMElement",
      [address, data, enable, chipSelect, writeEnable],
      [output],
      size,
      wordSize,
      initialData,
    );
  }

  resolve(): number {
    const [address, data, enable, chipSelect, writeEnable] = this.getInputs();
    const [output] = this.getOutputs();

    const idx = address.getValue()?.toUnsigned();
    this.log(LogLevel.TRACE, `Address: ${address.getValue()}, idx = ${idx}`);
    this.log(LogLevel.TRACE, `Data: ${data.getValue()}`);

    // "The output of a memory element is tri-state, and is enabled whenever both CS and OE are 0."
    if (
      BitString.low().equals(chipSelect.getValue()) &&
      BitString.low().equals(enable.getValue())
    ) {
      if (idx !== undefined && idx !== null) {
        if (idx > this.data.length) {
          output.setValue(null);
        } else {
          this.log(LogLevel.TRACE, `Read value: ${this.data[idx]}`);
          output.setValue(this.data[idx]);
        }
      }
    } else {
      output.setValue(null);
      this.log(
        LogLevel.TRACE,
        `CS = ${chipSelect.getValue()}, OE = ${enable.getValue()}. Disabling output.`,
      );
    }

    // "If CS and WE become 0, then a write will be initiated using the current values of the address
    // and data inputs. If CS and WE are already 0 and either the address or data input changes, a
    // write will be initiated."
    if (
      BitString.low().equals(chipSelect.getValue()) &&
      BitString.low().equals(writeEnable.getValue())
    ) {
      if (idx !== undefined && idx !== null && data.getValue() && idx < this.data.length) {
        this.log(LogLevel.TRACE, `Writing value: ${data.getValue()}`);
        this.data[idx] = data.getValue() ?? BitString.low(this.wordSize);
      } else {
        this.log(
          LogLevel.WARN,
          `Not writing: idx = ${idx} (size = ${this.data.length}), data = ${data.getValue()}`,
        );
      }
    } else {
      this.log(
        LogLevel.TRACE,
        `CS = ${chipSelect.getValue()}, WE = ${writeEnable.getValue()}. Not writing.`,
      );
    }

    return this.getPropagationDelay();
  }
}

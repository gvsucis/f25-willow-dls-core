import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { JLSRAM } from "../../src/CircuitElement/JLSRAM";

describe("JLSRAM behavior (read/write and CS/OE/WE branches)", () => {
  it("reads in-range value when CS and OE are low and idx > 0", () => {
    const address = new CircuitBus(2);
    const data = new CircuitBus(2);
    const output = new CircuitBus(2);
    const enable = new CircuitBus(1);
    const chipSelect = new CircuitBus(1);
    const writeEnable = new CircuitBus(1);

    const initial = [new BitString("00"), new BitString("10")];
    const ram = new JLSRAM(address, data, output, enable, chipSelect, writeEnable, 2, 2, initial);

    address.setValue(new BitString("01")); // idx = 1
    enable.setValue(BitString.low());
    chipSelect.setValue(BitString.low());

    ram.resolve();

    expect(output.getValue()?.equals("10")).toBeTruthy();
  });

  it("returns null when idx > data.length", () => {
    const address = new CircuitBus(3);
    const data = new CircuitBus(2);
    const output = new CircuitBus(2);
    const enable = new CircuitBus(1);
    const chipSelect = new CircuitBus(1);
    const writeEnable = new CircuitBus(1);

    const initial = [new BitString("00"), new BitString("01")];
    const ram = new JLSRAM(address, data, output, enable, chipSelect, writeEnable, 2, 2, initial);

    address.setValue(new BitString("11")); // idx = 3 > length
    enable.setValue(BitString.low());
    chipSelect.setValue(BitString.low());

    ram.resolve();

    expect(output.getValue()).toBeNull();
  });

  it("disables output when CS or OE are not low", () => {
    const address = new CircuitBus(2);
    const data = new CircuitBus(2);
    const output = new CircuitBus(2);
    const enable = new CircuitBus(1);
    const chipSelect = new CircuitBus(1);
    const writeEnable = new CircuitBus(1);

    const ram = new JLSRAM(address, data, output, enable, chipSelect, writeEnable, 2, 2, []);

    address.setValue(new BitString("01"));
    // chipSelect high -> output disabled
    chipSelect.setValue(BitString.high());
    enable.setValue(BitString.low());

    ram.resolve();

    expect(output.getValue()).toBeNull();
  });

  it("writes when CS and WE are low and idx in range", () => {
    const address = new CircuitBus(2);
    const data = new CircuitBus(2);
    const output = new CircuitBus(2);
    const enable = new CircuitBus(1);
    const chipSelect = new CircuitBus(1);
    const writeEnable = new CircuitBus(1);

    const ram = new JLSRAM(address, data, output, enable, chipSelect, writeEnable, 4, 2, []);

    // write '11' at address 1
    address.setValue(new BitString("01"));
    data.setValue(new BitString("11"));
    chipSelect.setValue(BitString.low());
    writeEnable.setValue(BitString.low());

    ram.resolve();

    // now read back by enabling output and OE low
    writeEnable.setValue(BitString.high());
    enable.setValue(BitString.low());
    chipSelect.setValue(BitString.low());

    ram.resolve();
    expect(output.getValue()?.equals("11")).toBeTruthy();
  });

  it("does not write when idx is out of range or missing (warn path)", () => {
    const address = new CircuitBus(3);
    const data = new CircuitBus(2);
    const output = new CircuitBus(2);
    const enable = new CircuitBus(1);
    const chipSelect = new CircuitBus(1);
    const writeEnable = new CircuitBus(1);

    const initial = [new BitString("00"), new BitString("01")];
    const ram = new JLSRAM(address, data, output, enable, chipSelect, writeEnable, 2, 2, initial);

    // attempt to write at idx == length (2) -> should not write
    address.setValue(new BitString("10")); // idx = 2
    data.setValue(new BitString("11"));
    chipSelect.setValue(BitString.low());
    writeEnable.setValue(BitString.low());

    ram.resolve();

    // read back at idx=1 to ensure unchanged
    address.setValue(new BitString("01"));
    writeEnable.setValue(BitString.high());
    enable.setValue(BitString.low());
    chipSelect.setValue(BitString.low());
    ram.resolve();

    expect(output.getValue()?.equals("01")).toBeTruthy();
  });

  it("performs read when idx == 0 (valid index 0)", () => {
    const address = new CircuitBus(2);
    const data = new CircuitBus(2);
    const output = new CircuitBus(2);
    const enable = new CircuitBus(1);
    const chipSelect = new CircuitBus(1);
    const writeEnable = new CircuitBus(1);

    const initial = [new BitString("01"), new BitString("10")];
    const ram = new JLSRAM(address, data, output, enable, chipSelect, writeEnable, 2, 2, initial);

    address.setValue(new BitString("00")); // idx = 0 -> falsy
    chipSelect.setValue(BitString.low());
    enable.setValue(BitString.low());

    ram.resolve();

    // output should return the value at index 0
    expect(output.getValue()?.equals("01")).toBeTruthy();
  });
});

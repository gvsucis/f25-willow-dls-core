import { BitString } from "../../src/BitString";
import { Memory } from "../../src/CircuitElement/Memory";

class TestMemory extends Memory {
  constructor(size: number, wordSize: number, initialData = [] as BitString[]) {
    super("TestMemory", [], [], size, wordSize, initialData);
  }

  resolve(): number {
    return this.getPropagationDelay();
  }
}

describe("Memory base behavior", () => {
  it("read and write with start+count semantics", () => {
    const mem = new TestMemory(8, 2);

    // default data are zeros
    expect(mem.read(0)).toBeInstanceOf(Array);

    // write two words at addr 1
    mem.write(1, [new BitString("10"), new BitString("11")]);

    const slice = mem.read(1, 2);
    expect(slice.length).toBe(2);
    expect(slice[0].equals("10")).toBeTruthy();
    expect(slice[1].equals("11")).toBeTruthy();
  });

  it("initialize with correct multiple of wordSize populates words", () => {
    const mem = new TestMemory(4, 2);

    // value width 4, wordSize 2 -> OK
    mem.initialize(new BitString("1010"));

    const first = mem.read(0, 1)[0];
    const second = mem.read(1, 1)[0];

    // initialization uses msb extraction; expect both words to be '10'
    expect(first.equals("10")).toBeTruthy();
    expect(second.equals("10")).toBeTruthy();
  });

  it("initialize throws when width is not multiple of wordSize", () => {
    const mem = new TestMemory(4, 2);

    expect(() => mem.initialize(new BitString("101"))).toThrow();
  });
});

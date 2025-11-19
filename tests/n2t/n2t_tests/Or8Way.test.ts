import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/or8Way.hdl",
    "Or8Way",
  );
});

const truthTable = [
  ["00000000", "0"],
  ["11111111", "1"],
  ["00010000", "1"],
  ["00000001", "1"],
  ["00100110", "1"],
  ["10101010", "1"],
  ["01010101", "1"],
];

function genTest(input: string, output: string) {
  return () => {
    const actualOutputs = circuit.run({ in: input }).outputs;
    expect(actualOutputs.out.toString()).toStrictEqual(output);
  };
}

for (const row of truthTable) {
  const input = row[0];
  const output = row[1];

  test(`N2T Or8Way [in = ${input}] => [out = ${output}]`, genTest(input, output));
}

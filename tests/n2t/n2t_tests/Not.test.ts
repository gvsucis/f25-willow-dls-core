import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/Not.hdl",
    "Not",
  );
});

const truthTable = [
  ["0", "1"],
  ["1", "0"],
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

  test(`N2T Not [in = ${input}] => [out = ${output}]`, genTest(input, output));
}

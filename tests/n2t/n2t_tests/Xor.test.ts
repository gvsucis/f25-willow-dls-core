import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/Xor.hdl",
    "Xor",
  );
});

const truthTable = [
  ["00", "0"],
  ["01", "1"],
  ["10", "1"],
  ["11", "0"],
];

function genTest(inputs: { a: string; b: string }, output: string) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.out.toString()).toStrictEqual(output);
  };
}

for (const row of truthTable) {
  const inputs = {
    a: row[0][0],
    b: row[0][1],
  };
  const output = row[1];

  test(
    `N2T Xor [a = ${inputs.a}, b = ${inputs.b}] => [out = ${output}]`,
    genTest(inputs, output),
  );
}

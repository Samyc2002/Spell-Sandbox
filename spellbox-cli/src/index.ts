import { compareFlow, generateFlow, validateFlow } from "./flows.ts";
import { ask } from "./utils.ts";

async function main() {
    const argv = process.argv;

    // node src/index.ts --compare path/a.json path/b.json
    const compareIndex = argv.findIndex(
        (arg) => arg === "--compare" || arg === "-c"
    );
    if (compareIndex !== -1) {
        const [pathA, pathB] = [argv[compareIndex + 1], argv[compareIndex + 2]];
        if (!pathA || !pathB) {
            console.log(
                "--compare requires two file paths: --compare a.json b.json"
            );
            process.exitCode = 1;
            return;
        }
        await compareFlow(pathA, pathB);
        return;
    }

    // node src/index.ts --file path/to/spell.json [--describe]
    const fileArgIndex = argv.findIndex(
        (arg) => arg === "--file" || arg === "-f"
    );
    const fileArg = fileArgIndex !== -1 ? argv[fileArgIndex + 1] : undefined;
    const describeFlag = argv.includes("--describe") || argv.includes("-d");

    if (fileArg) {
        await validateFlow(fileArg, describeFlag);
        return;
    }

    const mode = await ask(
        "Generate a random spell, validate one from a file, describe one, or compare two? (generate/validate/describe/compare): "
    );
    const choice = mode.trim().toLowerCase();

    if (choice.startsWith("c")) {
        const pathA = await ask("Path to the first spell JSON file: ");
        const pathB = await ask("Path to the second spell JSON file: ");
        await compareFlow(pathA.trim(), pathB.trim());
        return;
    }

    if (choice.startsWith("d")) {
        const filePath = await ask("Path to the spell JSON file: ");
        await validateFlow(filePath.trim(), true);
        return;
    }

    if (choice.startsWith("v")) {
        const filePath = await ask("Path to the spell JSON file: ");
        await validateFlow(filePath.trim(), false);
        return;
    }

    await generateFlow();
}

main();

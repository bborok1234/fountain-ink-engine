import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(packageRoot, "src");
const packageJson = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);

async function javaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return javaScriptFiles(target);
    return entry.isFile() && entry.name.endsWith(".js") ? [target] : [];
  }));
  return nested.flat().sort();
}

if (packageJson.dependencies || packageJson.peerDependencies) {
  throw new Error("The engine must remain zero-runtime-dependency at this stage.");
}

const exportedTargets = Object.values(packageJson.exports)
  .filter((target) => typeof target === "string" && target.endsWith(".js"));
for (const target of exportedTargets) {
  await access(path.join(packageRoot, target), constants.R_OK);
}

const forbiddenSpecifiers = [
  "react",
  "react-dom",
  "vite",
  "@fontsource/",
  "experiments/",
  "apps/ios",
  "Packages/FountainCore",
  "prototype/",
];
const sourceFiles = await javaScriptFiles(sourceRoot);
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const specifiers = Array.from(
    source.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g),
    (match) => match[2],
  );
  for (const specifier of specifiers) {
    if (forbiddenSpecifiers.some((fragment) => specifier.includes(fragment))) {
      throw new Error(`Forbidden engine import ${specifier} in ${file}`);
    }
  }
  await import(pathToFileURL(file));
}

const publicApi = await import(pathToFileURL(path.join(sourceRoot, "index.js")));
const requiredExports = [
  "engineModelVersion",
  "recipeSchemaVersion",
  "fixtureManifestVersion",
  "createExperimentRecord",
  "createFieldSignature",
  "ORDINARY_GREEN_RECIPE_R1",
  "ORDINARY_GREEN_RECIPE_R2",
  "ORDINARY_GREEN_RECIPE_R3",
  "ORDINARY_GREEN_RECIPE_R4",
  "ORDINARY_GREEN_RECIPE_R5",
  "ORDINARY_GREEN_RECIPE_R6",
  "ORDINARY_GREEN_RECIPE_R7",
  "ORDINARY_BLUE_BLACK_RECIPE_R1",
  "ORDINARY_BURGUNDY_RECIPE_R1",
  "ORDINARY_TEAL_RECIPE_R1",
  "ORDINARY_GREEN_RECIPE_R8",
  "ORDINARY_BLUE_BLACK_RECIPE_R2",
  "ORDINARY_BURGUNDY_RECIPE_R2",
  "ORDINARY_TEAL_RECIPE_R2",
  "ORDINARY_GREEN_RECIPE_R9",
  "ORDINARY_BLUE_BLACK_RECIPE_R3",
  "ORDINARY_BURGUNDY_RECIPE_R3",
  "ORDINARY_TEAL_RECIPE_R3",
  "ORDINARY_GREEN_RECIPE_R10",
  "ORDINARY_BLUE_BLACK_RECIPE_R4",
  "ORDINARY_BURGUNDY_RECIPE_R4",
  "ORDINARY_TEAL_RECIPE_R4",
  "ORDINARY_GREEN_RECIPE_R11",
  "ORDINARY_BLUE_BLACK_RECIPE_R5",
  "ORDINARY_BURGUNDY_RECIPE_R5",
  "ORDINARY_TEAL_RECIPE_R5",
  "ORDINARY_GREEN_RECIPE_R12",
  "ORDINARY_BLUE_BLACK_RECIPE_R6",
  "ORDINARY_BURGUNDY_RECIPE_R6",
  "ORDINARY_TEAL_RECIPE_R6",
  "dyeComponentModelVersion",
  "dyeComponentRecipeSchemaVersion",
  "EDGE_DYE_COMPONENT_RECIPE_R1",
  "EDGE_DYE_COMPONENT_RECIPE_R2",
  "EDGE_DYE_COMPONENT_RECIPE_R3",
  "EDGE_DYE_COMPONENT_RECIPE_R4",
  "EDGE_DYE_COMPONENT_RECIPE_R5",
  "sheenComponentModelVersion",
  "sheenComponentRecipeSchemaVersion",
  "SHEEN_COMPONENT_RECIPE_R1",
  "createSheenSurfaceFilm",
  "compositeSheenOptical",
  "assertSheenComponentRecipeCompatible",
  "parseSheenComponentRecipe",
  "compositeDyeEdgeOptical",
  "assertDyeComponentRecipeCompatible",
  "parseDyeComponentRecipe",
  "PAPER_SURFACE_SMOOTH_R1",
  "PAPER_SURFACE_BALANCED_R1",
  "PAPER_SURFACE_BALANCED_R2",
  "PAPER_SURFACE_ABSORBENT_R1",
  "PAPER_SURFACE_ABSORBENT_R2",
  "PAPER_SURFACE_ABSORBENT_R3",
  "PAPER_SURFACE_ABSORBENT_R4",
  "assertSurfaceRecipeCompatible",
  "createPaperFiberEdge",
  "MAX_KEYBOARD_SURFACE_STEPS",
  "validateInkRecipe",
  "assertInkRecipeCompatible",
  "assertRegisteredInkRecipeIdentity",
  "serializeInkRecipe",
  "parseInkRecipe",
  "hashString",
  "randomFrom",
  "splitGraphemes",
  "getNibGeometry",
  "ACTIVE_CONTACT_CATALOG_ID",
  "getGlyphContactGeometry",
  "analyzeContactAlpha",
  "morphologyPass",
  "createDensityField",
  "createOrdinaryConcentrationField",
  "MAX_GLYPH_CONTACTS",
  "compositeOrdinaryInk",
  "compositeOrdinaryOptical",
  "WetInkSimulation",
  "createMaterialCoverage",
  "resolveKeyboardSurfaceCoverage",
  "getSurfaceDensityRange",
  "getDirectDepositLoads",
  "makeGlyphMask",
  "beginOrdinaryInkMaterial",
  "completeOrdinaryInkMaterial",
  "prepareOrdinaryInkCanvasInput",
  "renderOrdinaryInkMaterial",
  "upsampleKeyboardSurfaceCoverage",
];
for (const name of requiredExports) {
  if (!(name in publicApi)) throw new Error(`Missing public export: ${name}`);
}

process.stdout.write(
  `Validated ${sourceFiles.length} source modules and ${exportedTargets.length} public entry points.\n`,
);

#!/usr/bin/env node
import yargs from "yargs";
import path from "path";
import { Logger } from "./utils/logger";
import { parseAndGenerate, Options } from "./index";
import packageJson from "../package.json";
import { glob } from "glob";
import axios from "axios";
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "fs";

const conf = yargs(process.argv.slice(2))
    .version(packageJson.version)
    .usage("wsdl-tsclient [options] [path]")
    .example("", "wsdl-tsclient file.wsdl -o ./generated/")
    .example("", "wsdl-tsclient ./res/**/*.wsdl -o ./generated/")
    .demandOption(["o"])
    .option("o", {
        type: "string",
        description: "Output directory",
    })
    .option("version", {
        alias: "v",
        type: "boolean",
    })
    .option("emitDefinitionsOnly", {
        type: "boolean",
        description: "Generate only Definitions",
    })
    .option("modelNamePreffix", {
        type: "string",
        description: "Prefix for generated interface names",
    })
    .option("modelNameSuffix", {
        type: "string",
        description: "Suffix for generated interface names",
    })
    .option("caseInsensitiveNames", {
        type: "boolean",
        description: "Case-insensitive name while parsing definition names",
    })
    .option("maxRecursiveDefinitionName", {
        type: "number",
        description: "Maximum count of definition's with same name but increased suffix. Will throw an error if exceed",
    })
    .option("quiet", {
        type: "boolean",
        description: "Suppress all logs",
    })
    .option("verbose", {
        type: "boolean",
        description: "Print verbose logs",
    })
    .option("no-color", {
        type: "boolean",
        description: "Logs without colors",
    }).argv;

// Logger section

if (conf["no-color"] || process.env.NO_COLOR) {
    Logger.colors = false;
}

if (conf.verbose || process.env.DEBUG) {
    Logger.isDebug = true;
}

if (conf.quiet) {
    Logger.isDebug = false;
    Logger.isLog = false;
    Logger.isInfo = false;
    Logger.isWarn = false;
    Logger.isError = false;
}

// Options override section

const options: Partial<Options> = {};

if (conf["no-color"] || process.env.NO_COLOR) {
    options.colors = false;
}

if (conf.verbose || process.env.DEBUG) {
    options.verbose = true;
}

if (conf.quiet) {
    options.quiet = true;
}

if (conf.emitDefinitionsOnly) {
    options.emitDefinitionsOnly = true;
}

if (conf.modelNamePreffix) {
    options.modelNamePreffix = conf.modelNamePreffix;
}

if (conf.modelNameSuffix) {
    options.modelNameSuffix = conf.modelNameSuffix;
}

if (conf.maxRecursiveDefinitionName || conf.maxRecursiveDefinitionName == 0) {
    options.maxRecursiveDefinitionName = conf.maxRecursiveDefinitionName;
}

if (conf.caseInsensitiveNames) {
    options.caseInsensitiveNames = conf.caseInsensitiveNames;
}

Logger.debug("Options");
Logger.debug(JSON.stringify(options, null, 2));

//

if (conf._ === undefined || conf._.length === 0) {
    Logger.error("No WSDL files found");
    Logger.debug(`Path: ${conf._}`);
    process.exit(1);
}

(async function () {
    if (conf.o === undefined || conf.o.length === 0) {
        Logger.error("You forgot to pass the path to the output directory -o");
        process.exit(1);
    } else {
        const outDir = path.resolve(conf.o);

        let errorsCount = 0;
        const filePatterns = conf._ as string[];
        const urlPatterns = [];
        const localPatterns = [];

        const tempDir = path.join(outDir, "temp");
        if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true });
        }

        for (const pattern of filePatterns) {
            if (/^https?:\/\//i.test(pattern)) {
                urlPatterns.push(pattern);
            } else {
                localPatterns.push(pattern);
            }
        }

        try {
            for (const urlPattern of urlPatterns) {
                try {
                    const response = await axios.get(urlPattern);
                    const fileName = path.basename(urlPattern).replace(/\?.*$/, "");
                    const tempFilePath = path.join(tempDir, fileName);
                    writeFileSync(tempFilePath, response.data);
                    Logger.log(`Downloaded "${fileName}" from "${urlPattern}"`);
                    Logger.log(`Generating SOAP client from "${fileName}"`);
                    try {
                        await parseAndGenerate(tempFilePath, path.join(outDir), options);
                    } catch (err) {
                        Logger.error(`Error occurred while generating client "${fileName}"`);
                        Logger.error(`\t${err}`);
                        errorsCount += 1;
                    }
                    unlinkSync(tempFilePath);
                } catch (err) {
                    Logger.error(`Error downloading "${urlPattern}": ${err}`);
                    errorsCount += 1;
                }
            }

            rmSync(tempDir, { recursive: true, force: true });

            const localMatches = await glob(localPatterns);

            if (localMatches.length === 0) {
                Logger.error("No local WSDL files found");
                process.exit(1);
            }

            if (localMatches.length > 1) {
                Logger.debug(localMatches.map((m) => path.resolve(m)).join("\n"));
                Logger.log(`Found ${localMatches.length} local WSDL files`);
            }

            for (const match of localMatches) {
                const wsdlPath = path.resolve(match);
                const wsdlName = path.basename(wsdlPath);
                Logger.log(`Generating SOAP client from "${wsdlName}"`);
                try {
                    await parseAndGenerate(wsdlPath, path.join(outDir), options);
                } catch (err) {
                    Logger.error(`Error occurred while generating client "${wsdlName}"`);
                    Logger.error(`\t${err}`);
                    errorsCount += 1;
                }
            }

            if (errorsCount) {
                Logger.error(`${errorsCount} Errors occurred!`);
                process.exit(1);
            }
        } catch (err) {
            Logger.error(`Error while processing WSDL files: ${err}`);
            process.exit(1);
        }
    }
})();

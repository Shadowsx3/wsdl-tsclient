export { generate } from "./generator";
export { parseWsdl } from "./parser";
export declare enum ModelPropertyNaming {
    "camelCase" = "camelCase",
    "PascalCase" = "PascalCase"
}
export interface Options {
    /**
     * Generate only Definitions
     * @default false
     */
    emitDefinitionsOnly: boolean;
    /**
     * Prefix for generated interface names
     * @default ""
     */
    modelNamePreffix: string;
    /**
     * Suffix for generated interface names
     * @default ""
     */
    modelNameSuffix: string;
    /**
     * Case-insensitive name while parsing definition names
     * @default false
     */
    caseInsensitiveNames: boolean;
    /**
     * Maximum count of definition's with same name but increased suffix. Will throw an error if exceed
     * @default 64
     */
    maxRecursiveDefinitionName: number;
    modelPropertyNaming: ModelPropertyNaming;
    /**
     * Print verbose logs
     * @default false
     */
    verbose: boolean;
    /**
     * Suppress all logs
     * @default false
     */
    quiet: boolean;
    /**
     * Logs with colors
     * @default true
     */
    colors: boolean;
}
export declare const defaultOptions: Options;
export declare function parseAndGenerate(wsdlPath: string, outDir: string, options?: Partial<Options>): Promise<void>;
//# sourceMappingURL=index.d.ts.map
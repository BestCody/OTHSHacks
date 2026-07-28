import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["app", "components", "public"].map((directory) => join(process.cwd(), directory));
const sourceExtensions = new Set([".html", ".js", ".jsx", ".ts", ".tsx"]);

function collectFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectFiles(path) : [path];
  });
}

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

describe("strict style CSP source code", () => {
  it("contains no inline style tags, style attributes, or runtime style mutations", () => {
    for (const file of roots.flatMap(collectFiles).filter((path) => sourceExtensions.has(extension(path)))) {
      const source = readFileSync(file, "utf8");
      expect(source, `${file} contains a style tag`).not.toMatch(/<style\b/i);
      expect(source, `${file} contains an HTML style attribute`).not.toMatch(/\bstyle\s*=\s*["']/i);
      expect(source, `${file} contains a React style prop`).not.toMatch(/\bstyle\s*=\s*\{\{/);
      expect(source, `${file} mutates element.style`).not.toMatch(/\.style(?:\.|\[)/);
    }
  });
});

import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const aliasNotice = (canonical: string) => `
> [!TIP]
> **This package (::alias::) is an official alias of [${canonical}](https://npmjs.com/package/${canonical}).**

<details>
<summary>Why does this exist?</summary>

We provide this package to offer shorter import paths and improved discoverability. While both packages provide identical functionality, **${canonical}** is the primary source of truth.
</details>

<details>
<summary>Which one should I use?</summary>

* **Use ::alias::** if you prefer the shorter name or specific branding or ESM Only.
* **Use ${canonical}** for the most stable long-term reference and standard alignment.

| Feature | ${canonical} | ::alias:: |
| --- | --- | --- |
| **Source Code** | ✅ Primary | 🔗 Proxy |
| **Updates** | Immediate | Synchronized (Immediately) |
| **Bundle Size** | 100% | 100% (Zero overhead) |
| **Format** | ESM + CJS | ESM Only |
| **Maintenance** | ✅ Primary | 🔗 Proxy (inherits) |
| **Security** | ✅ Primary | 🔗 Proxy (inherits) |

</details>

<details>
<summary>Maintenance & Support</summary>

> **Security:** Security audits are performed on the canonical package; this alias inherits all security patches automatically.
</details>

---

`;

const getPackageDirs = async (root = process.cwd()) => {
  const packagesDir = path.resolve(root, "packages");
  try {
    await fs.access(packagesDir);
  } catch {
    return [];
  }
  const dirents = await fs.readdir(packagesDir, {
    withFileTypes: true,
  });
  return dirents
    .filter((d) => d.isDirectory())
    .map((d) => path.join(packagesDir, d.name));
};

const normalizeSubpath = (key: string) => {
  if (key === ".") return "";
  return key.replace(/^\.\//, "");
};

const createExportFile = async ({
  outDir,
  canonicalImport,
}: {
  outDir: string;
  canonicalImport: string;
}) => {
  const fileContent = `export * from "${canonicalImport}";\n`;

  await fs.mkdir(path.dirname(outDir), { recursive: true });

  await Promise.all([
    fs.writeFile(`${outDir}.mjs`, fileContent, "utf-8"),
    fs.writeFile(`${outDir}.d.ts`, fileContent, "utf-8"),
  ]);
};

const publishAliases = async () => {
  const args = parseArgs({
    options: {
      "published-packages": {
        type: "string",
      },
    },
  });

  const publishedPackagesRaw = args.values["published-packages"];

  let publishedPackages:
    | {
        name: string;
        version: string;
      }[]
    | null = null;

  if (publishedPackagesRaw) {
    try {
      publishedPackages = JSON.parse(publishedPackagesRaw);

      console.log(
        `Filtering for published packages: ${publishedPackages
          ?.map((p) => p.name)
          .join(", ")}`,
      );
    } catch (e) {
      console.error("Failed to parse published-packages argument", e);
      return;
    }
  }

  const packageDirs = await getPackageDirs();

  await Promise.all(
    packageDirs.map(async (dir) => {
      const pkgJsonPath = path.join(dir, "package.json");

      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf-8"));

      const canonical = pkgJson.name;

      if (publishedPackages) {
        const isPublished = publishedPackages.some(
          (p) => p.name === canonical && p.version === pkgJson.version,
        );

        if (!isPublished) {
          return;
        }
      }

      const aliases = pkgJson.forge?.aliases;

      if (!Array.isArray(aliases) || aliases.length === 0) {
        return;
      }

      console.log(`Processing aliases for ${canonical}: ${aliases.join(", ")}`);

      let readmeContent = "";

      try {
        const originalReadme = await fs.readFile(
          path.join(dir, "README.md"),
          "utf-8",
        );

        const sections = originalReadme.split(/\n#{1,6}\s+.*Installation/i);

        if (sections.length >= 2) {
          readmeContent =
            sections[0] +
            "\n## 📦 Installation\n\n" +
            aliasNotice(canonical) +
            sections.slice(1).join("");
        } else {
          const readMeLines = originalReadme.split("\n");

          readmeContent =
            readMeLines[0] +
            "\n\n" +
            aliasNotice(canonical) +
            "\n\n" +
            readMeLines.slice(1).join("\n");
        }
      } catch {
        readmeContent = aliasNotice(canonical);
      }

      const originalExports =
        pkgJson.exports ||
        (pkgJson.main ? { ".": pkgJson.main } : { ".": "./index.js" });

      for (const alias of aliases) {
        const aliasDir = path.join(
          dir,
          "dist-aliases",
          alias.replace(/[/@]/g, "_"),
        );

        await fs.rm(aliasDir, {
          recursive: true,
          force: true,
        });

        await fs.mkdir(aliasDir, {
          recursive: true,
        });

        const aliasPkgJson: Record<string, unknown> = {
          ...pkgJson,
          name: alias,
          scripts: {},
          devDependencies: {},
          forge: undefined,
          type: "module",
          dependencies: {
            [canonical]: pkgJson.version,
          },
          exports: {},
        };

        delete aliasPkgJson.main;
        delete aliasPkgJson.module;
        delete aliasPkgJson.types;

        for (const key in originalExports) {
          const subpath = normalizeSubpath(key);

          // passthrough package.json
          if (/package\.json$/.test(key)) {
            aliasPkgJson.exports[key] = "./package.json";
            continue;
          }

          // CSS re-export
          if (key.endsWith(".css")) {
            const cssPath = subpath;

            await fs.mkdir(path.dirname(path.join(aliasDir, cssPath)), {
              recursive: true,
            });

            await fs.writeFile(
              path.join(aliasDir, cssPath),
              `@import "${canonical}/${cssPath}";\n`,
              "utf-8",
            );

            aliasPkgJson.exports[key] = `./${cssPath}`;

            continue;
          }

          const canonicalImport = subpath
            ? `${canonical}/${subpath}`
            : canonical;

          const outputBase = subpath
            ? path.join(aliasDir, subpath)
            : path.join(aliasDir, "index");

          await createExportFile({
            outDir: outputBase,
            canonicalImport,
          });

          const exportPath = `./${path
            .relative(aliasDir, `${outputBase}.mjs`)
            .replace(/\\/g, "/")}`;

          const typesPath = `./${path
            .relative(aliasDir, `${outputBase}.d.ts`)
            .replace(/\\/g, "/")}`;

          aliasPkgJson.exports[key] = {
            import: exportPath,
            types: typesPath,
            default: exportPath,
          };
        }

        const rootExport = aliasPkgJson.exports["."];

        if (rootExport && typeof rootExport === "object") {
          aliasPkgJson.main = rootExport.default;
          aliasPkgJson.module = rootExport.import;
          aliasPkgJson.types = rootExport.types;
        }

        await Promise.all([
          fs.writeFile(
            path.join(aliasDir, "README.md"),
            readmeContent.replaceAll("::alias::", alias),
            "utf-8",
          ),

          fs.writeFile(
            path.join(aliasDir, "package.json"),
            JSON.stringify(aliasPkgJson, null, 2),
            "utf-8",
          ),
        ]);

        console.log(`Publishing alias ${alias}...`);

        try {
          execSync(`npm publish --provenance --access public`, {
            cwd: aliasDir,
            stdio: "inherit",
          });

          console.log(`Successfully published ${alias}`);
        } catch (err) {
          console.error(`Failed to publish ${alias}:`, err);
        }
      }
    }),
  );
};

if (process.env["NPM_TOKEN"]) {
  execSync(
    `npm config set //registry.npmjs.org/:_authToken ${process.env["NPM_TOKEN"]}`,
  );
}

publishAliases()
  .then(() => {
    console.log("Aliases published successfully");
  })
  .catch((e) => {
    console.error("Failed to publish aliases", e);
    process.exit(1);
  });

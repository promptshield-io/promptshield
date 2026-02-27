import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import pLimit from "p-limit";

const limit = pLimit(4);

const PACKAGES_DIR = "packages";
const DOCS_ROOT = "apps/web/content/docs";
const MAIN_PACKAGE_DIR = "core";

await fs.mkdir(DOCS_ROOT, { recursive: true });

/**
 * Safely renames a file or directory.
 * - Skips if source does not exist
 * - Removes target if already exists
 *
 * Prevents common Windows EPERM failures due to leftover folders.
 */
const safeRename = async (from: string, to: string) => {
  try {
    await fs.access(from);
  } catch {
    return;
  }

  try {
    await fs.access(to);
    await fs.rm(to, { recursive: true, force: true });
  } catch {
    // target does not exist
  }

  await fs.rename(from, to);
};

const PKG_DOC_DIRS = (await fs.readdir(PACKAGES_DIR, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => [d.name, d.name === MAIN_PACKAGE_DIR ? `(${d.name})` : d.name]);

await Promise.all(
  PKG_DOC_DIRS.map(([, docsDir]) =>
    limit(async () => {
      try {
        await fs.access(path.join(DOCS_ROOT, docsDir));
      } catch {
        return;
      }
      for (const versionDir of await fs.readdir(
        path.join(DOCS_ROOT, docsDir),
      )) {
        if (/^\(v\d+\)$/.test(versionDir)) {
          await safeRename(
            path.join(DOCS_ROOT, docsDir, versionDir),
            path.join(DOCS_ROOT, docsDir, versionDir.replace(/^\(|\)$/g, "")),
          );
        }
      }
    }),
  ),
);

let shouldReset = true;
try {
  execFileSync("git", ["add", DOCS_ROOT]);
  execFileSync("git", [
    "commit",
    "-m",
    "chore(docs): remove brackets for proper git diff",
  ]);
} catch {
  shouldReset = false;
}

console.log("dirs------------", PKG_DOC_DIRS);

// Generate new docs
for (const [pkgDir, docsDir] of PKG_DOC_DIRS) {
  const pkgPath = path.join(PACKAGES_DIR, pkgDir);
  const pkgJsonPath = path.join(pkgPath, "package.json");
  const entry = path.join(pkgPath, "src/index.ts").replaceAll("\\", "/");
  try {
    await fs.access(pkgJsonPath);
    await fs.access(entry);
  } catch {
    continue;
  }
  const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf8"));
  const major = pkgJson.version.split(".")[0];
  const outDir = path.join(DOCS_ROOT, docsDir, `v${major}`, "api");

  console.log(
    `Generating docs for ${pkgJson.name}@${pkgJson.version} in ${outDir}`,
  );

  execFileSync(
    process.execPath,
    [
      "node_modules/typedoc/bin/typedoc",
      "--options",
      "typedoc.base.config.ts",
      "--tsconfig",
      "tsconfig.docs.json",
      "--entryPoints",
      entry,
      "--out",
      outDir,
    ],
    { stdio: "inherit" },
  );

  await fs.copyFile(
    path.join(pkgPath, "README.md"),
    path.join(outDir, "..", "overview.mdx"),
  );

  // Copy reference docs
  try {
    const cutomDocsDir = path.join(pkgPath, "docs");
    if ((await fs.stat(cutomDocsDir)).isDirectory()) {
      await fs.cp(path.join(pkgPath, "docs"), path.resolve(outDir, ".."), {
        recursive: true,
      });
    }
  } catch {
    // Ignore
  }

  const rootMetaFilePath = path.join(DOCS_ROOT, docsDir, "meta.json");
  try {
    await fs.access(rootMetaFilePath);
  } catch {
    await fs.writeFile(
      rootMetaFilePath,
      JSON.stringify(
        {
          title: pkgJson.name,
          description: pkgJson.description,
          lastModified: new Date().toISOString(),
          version: pkgJson.version,
          root: true,
          icon: pkgJson.forge?.icon || (pkgJson.bin ? "Terminal" : "FileCode"),
        },
        null,
        2,
      ),
    );
  }
}

// copy banner image
try {
  await fs.copyFile(
    path.join(process.cwd(), "banner.gif"),
    path.join(DOCS_ROOT, "banner.gif"),
  );
} catch {
  // ignore
}

/* ---------------------------------- */
/* 2. Rename .md to .mdx (ASYNC)       */
/* ---------------------------------- */

const walk = async (
  dir: string,
  action: (file: string) => Promise<void>,
): Promise<void> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, action);
      } else {
        await action(fullPath);
      }
    }),
  );
};

await walk(DOCS_ROOT, async (file) => {
  if (file.endsWith(".md")) {
    await safeRename(file, file.replace(/.md$/, ".mdx"));
  }
});

/* ---------------------------------- */
/* 3. Inject frontmatter (ASYNC)       */
/* ---------------------------------- */

const commitHash = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();

execFileSync("git", ["add", DOCS_ROOT]);
const changedDocs = execFileSync(
  "git",
  ["status", "--porcelain", "--", DOCS_ROOT],
  { encoding: "utf8" },
)
  .split("\n")
  .filter((f) => {
    console.log(f, f.trim().split(/:|\s+/));
    return f.endsWith(".mdx");
  })
  .map((f) => f.trim().split(/:|\s+/)[1].trim());

console.log(changedDocs);

const DEFINED_IN_REGEXP = /Defined in.*?\((https:\/\/github\.com\/[^)]+)\)/;

const createMeta = async (file: string) => {
  if (!file.endsWith(".mdx")) {
    return;
  }
  const src = await fs.readFile(file, "utf8");

  // Extract title safely
  const title = file.endsWith("api/index.mdx")
    ? "API Docs"
    : file.endsWith("overview.mdx")
      ? "Overview"
      : (src
          .match(/^#\s+(.+)$/m)?.[1]
          ?.replace(/^(Function|Interface|Type alias|Variable):\s*/i, "")
          .replace(/\\+/, "")
          .split("<img")[0]
          .trim() ?? path.basename(file, ".mdx"));

  const editURL = src.match(DEFINED_IN_REGEXP)?.[1];
  const metaPath = file.replace("/api/", "/.meta/").replace(/\.mdx$/, ".json");

  await fs.mkdir(path.dirname(metaPath), { recursive: true });

  await fs.writeFile(
    metaPath,
    `${JSON.stringify(
      {
        title,
        editURL,
        commitHash,
        lastModified: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
};

await Promise.all(
  changedDocs.map((f) => limit(() => createMeta(f).catch(() => {}))),
);

await Promise.all(
  PKG_DOC_DIRS.map(([, docsDir]) =>
    limit(async () => {
      try {
        await fs.access(path.join(DOCS_ROOT, docsDir));
      } catch {
        return;
      }
      const versionDirs = (
        await fs.readdir(path.join(DOCS_ROOT, docsDir))
      ).filter((dir) => /^v\d+$/.test(dir));
      const maxVersion = Math.max(
        ...versionDirs.map((v) => Number(v.replace("v", ""))),
      );
      await safeRename(
        path.join(DOCS_ROOT, docsDir, `v${maxVersion}`),
        path.join(DOCS_ROOT, docsDir, `(v${maxVersion})`),
      );
    }),
  ),
);

if (shouldReset) {
  try {
    execFileSync("git", ["reset", "HEAD~1"], { stdio: "inherit" });
  } catch {
    // Ignore if nothing to reset
  }
}

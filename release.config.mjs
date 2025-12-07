import { readFileSync, writeFileSync, cpSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * 
 * @returns @type {{pkgRoot: string, libDir: string}}
 */
function getPkgRoot(){
  const pkgRoot = "distTemp";
  //console.info(`Temporary distribution directory: ${pkgRoot}`);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const originalPackageJsonPath = resolve(__dirname, 'package.json');
  const originalPackageJson = JSON.parse(readFileSync(originalPackageJsonPath, 'utf8'));
  const { 
    name, version, description, bin, type, main, types, 
    keywords, author, repository, license, dependencies,
    engines
  } = originalPackageJson;
  const publishConfig = originalPackageJson.publishConfig || {};
  if(!publishConfig.tag) {
      publishConfig.tag="latest";
  }
  const packageLibDir = "lib";
  const files = [packageLibDir];
  const packageJson = {
    name, version, description, bin, type, main, types, 
    keywords, author, repository, license, dependencies,
    engines, files
  }
  //const buildDir = resolve(__dirname, "dist");
  //cpSync(buildDir, resolve(__dirname, pkgRoot, "lib"), { recursive: true });
  mkdirSync(resolve(__dirname, pkgRoot, packageLibDir), { recursive: true });
  writeFileSync(resolve(__dirname, pkgRoot, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  //console.info(`distirbution package.json created in temporary dir ${pkgRoot}`);
  return {pkgRoot, libDir: `${pkgRoot}/${packageLibDir}`}
}

/**
 * @reutnr @type {import('semantic-release').GlobalConfig}
 */
const getConfig = () => {
  const { pkgRoot, libDir } = getPkgRoot();
  const config = {
    branches: ["main"],
    plugins: [
      "@semantic-release/commit-analyzer",
      [
        "@semantic-release/exec",
        {"verifyReleaseCmd": `npm run build -- --env.nextVersion=\${nextRelease.version} --outDir=${libDir}`}
      ],
      ["@semantic-release/npm", {pkgRoot}],
      "@semantic-release/changelog@6.0.0"
    ]
  }
  return config;
};

export default getConfig();

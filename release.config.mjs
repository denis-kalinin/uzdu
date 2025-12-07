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
  mkdirSync(resolve(__dirname, pkgRoot, packageLibDir), { recursive: true });
  writeFileSync(resolve(__dirname, pkgRoot, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  try{
    cpSync(resolve(__dirname, "README.md"), resolve(__dirname, pkgRoot, 'README.md'));
    cpSync(resolve(__dirname, "LICENSE"), resolve(__dirname, pkgRoot, 'LICENSE'));
  }catch {}
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
      ["@semantic-release/npm", {pkgRoot}]
    ]
  }
  return config;
};
export default getConfig();

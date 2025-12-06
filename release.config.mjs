import { readFileSync, writeFileSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const pkgRoot = "distTemp";
function init(){
  console.info(`Temporary distribution directory: ${pkgRoot}`);
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
  const files = ["lib"];
  const packageJson = {
    name, version, description, bin, type, main, types, 
    keywords, author, repository, license, dependencies,
    engines, files
  }
  //const buildDir = resolve(__dirname, "dist");
  //cpSync(buildDir, resolve(__dirname, pkgRoot, "lib"), { recursive: true });
  writeFileSync(resolve(__dirname, pkgRoot, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
}
init();
/**
 * @type {{ branches: string[], plugins: (string | [string, {pkgRoot?: string, analyzeCommitsCmd?: string, verifyReleaseCmd?: string}])[]}}
 *  semantic-release/release-notes-generator
 */
const getConfig = () =>  {
  const config = {
    branches: ["main"],
    plugins: [
      "@semantic-release/commit-analyzer",
      ["@semantic-release/npm", {"pkgRoot": "distTemp"}],
      "@semantic-release/changelog@6.0.0"
    ]
  }
  console.info("semantic-release config");
  console.dir(config);
  return config;
};
export default getConfig();

/*
    [
      "@semantic-release/exec",
      {"verifyReleaseCmd": `npm run build -- --env.nextVersion=\${nextRelease.version} --outDir=${pkgRoot}/lib`}
    ],
*/

/**
 * @type {{ plugins: (string | [string, {pkgRoot: string}])[]}}
 *         "@semantic-release/release-notes-generator"
 */
export default {
  branches: ["main"],
  /*
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/exec", {
      "verifyConditionsCmd": "npm run release -- --env.nextVersion=${nextRelease.version}",
    }],
    ["@semantic-release/npm", {pkgRoot: "distTemp"}],
  ]
    */
  plugins: [
    "@semantic-release/commit-analyzer"
  ]
};
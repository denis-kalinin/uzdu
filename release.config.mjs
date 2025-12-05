/**
 * @type {{ plugins: (string | [string, {pkgRoot: string}])[]}}
 *         "@semantic-release/release-notes-generator"
 */
export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    ["@semantic-release/npm", {pkgRoot: "distTemp"}],

  ]
};
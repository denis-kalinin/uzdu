# UZDU – Universal Zip archiver, Downloader and Uploader for Node.js/Deno/Bun



[![NPM Version](https://img.shields.io/npm/v/uzdu)](https://www.npmjs.com/package/uzdu)
[![NPM Downloads](https://img.shields.io/npm/dm/uzdu)](https://www.npmjs.com/package/uzdu)
[![Release](https://github.com/denis-kalinin/uzdu/actions/workflows/release.yml/badge.svg?event=workflow_dispatch)](https://github.com/denis-kalinin/uzdu/actions/workflows/release.yml)
![GitHub commit activity](https://img.shields.io/github/commit-activity/y/denis-kalinin/uzdu)


## For users

UZDU is a convinient tool to deploy files to a web server. If you're a DevOps enthusiast and prefer to stay in your familiar <span>Node.js</span> environment, you can deploy using this tool.

Node.js:
```bash
npx uzdu -h
```

Deno:
```bash
deno run -A npm:uzdu -h
```

Bun:
```
bunx uzdu -h
```

### uploading

- [Amazon S3](https://docs.aws.amazon.com/s3/) `npx uzdu upload aws -h`
- [Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs) `npx uzdu upload az -h`
- [Nexus](https://support.sonatype.com/hc/en-us/articles/115006744008-Repository-How-can-I-programmatically-upload-files-into-Nexus-3#DirectUploadusingHTTPPUTtotheRepositoryPath) `npx uzdu upload http -h`
- SSH/SCP `npx uzdu upload ssh -h`

### downloading

- http `npx uzdu download http -h`

### working with zip-archives

- zip `npx uzdu zip -h`
- unzip `npx uzdu unzip -h`


## For developers

1. [Gif flow guide](docs/git-flow.md)
2. [Semantic release](docs/semantic-release.md)
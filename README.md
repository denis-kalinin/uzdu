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

- [Amazon S3](https://docs.aws.amazon.com/s3/) `npx uzdu upload aws --dotenv /projects/environments/test.env -- build/index.html -- uzdu:ru-central1-d:http://storage.yandexcloud.net`
- [Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs) `AZURE_STORAGE_CONNECTION_STRING=...; npx uzdu upload azure build/ $web`
- [Nexus](https://support.sonatype.com/hc/en-us/articles/115006744008-Repository-How-can-I-programmatically-upload-files-into-Nexus-3#DirectUploadusingHTTPPUTtotheRepositoryPath) `npx upload http --header "Authorization: Basic TOKEN=" -- website.zip https://nexus/repository/private-raw/dist/test-uzdu/website.zip",`
- SSH/SFTP `npx uzdu upload ssh /projects/website/build/ sftp://root:password@example.localtest.me/var/www/html/`

### downloading

- http `npx uzdu download http --dotenv --header \"Authorization: Basic TOKEN=\" https://nexus/repository/private-raw/dist/test-uzdu/website.zip website.zip`

### working with zip-archives

- zip `npx uzdu zip build/ ./build.zip`
- unzip `npx uzdu unzip /tmp/repo.zip ./src`


## For developers

1. [Gif flow guide](docs/git-flow.md)
2. [Semantic release](docs/semantic-release.md)
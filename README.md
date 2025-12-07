# Convinient deployment tool

UZDU is a convinient tool to deploy files to a web server. If you're a DevOps enthusiast and prefer to stay in your familiar NodeJS environment, you can deploy using this tool.

You have NodeJS intalled, then run:
```bash
npx uzdu -h
```
## uploading

- [Amazon S3](https://docs.aws.amazon.com/s3/) `npx uzdu up aws -h`
- [Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs) `npx uzdu up az -h`
- [Nexus](https://support.sonatype.com/hc/en-us/articles/115006744008-Repository-How-can-I-programmatically-upload-files-into-Nexus-3#DirectUploadusingHTTPPUTtotheRepositoryPath) `npx uzdu up http -h`
- SSH/SCP `npx uzdu up ssh -h`

## downloading

- http `npx uzdu down http -h`

## working with zip-archives

- zip `npx uzdu zip -h`
- unzip `npx uzdu unzip -h`
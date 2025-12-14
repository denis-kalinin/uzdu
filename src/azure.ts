import { BlobHTTPHeaders, BlobServiceClient }  from "@azure/storage-blob";
import path from "path";
import fs from "fs";
import {BlobObject, listBlobs, listFiles} from "./utils";

type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
type Defaults<T> = Required<Pick<T, OptionalKeys<T>>>

export interface AzureStorageOptions {
  connectionString: string;
  container?: string;
}

export default async function upload(dir: string, options: AzureStorageOptions, metadataFile: string = ".metadata.json") {
  if(!options.connectionString) throw Error("Uploader needs connection string for Azure Blob Storage. Provide AZURE_STORAGE_CONNECTION_STRING environment variable!");
  const opts = Object.assign({}, {container: "$web"}, options);
  const blobServiceClient = BlobServiceClient.fromConnectionString(options.connectionString);
  const isDebug = process.env.DEBUG && process.env.DEBUG.toLowerCase() === "true";
  const containerClient = blobServiceClient.getContainerClient(opts.container);
  let dist = path.resolve(process.cwd(), dir);
  const files = await listFiles(dir);
  let metadata: {[key: string]: BlobObject};
  try {
    const metadataJson = fs.readFileSync(path.join(dir, metadataFile),  { encoding: "utf-8"});
    metadata = JSON.parse(metadataJson);
  }catch (e) {}
  if(Object.keys(files).length == 1){ //hm... is dist a file? let's check
    const lstat = fs.lstatSync(dist);
    if(lstat.isFile()){
      dist = path.dirname(dist);
    }
  }
  await Promise.all(Object.entries(files).map(async ([file, absFile]) => {
    let blobObj;
    if(metadata){
      blobObj = metadata[file];
    }
    const blockBlobClient = containerClient.getBlockBlobClient(file);
    const blobHTTPHeaders: BlobHTTPHeaders = {};
    if(blobObj?.headers){
      const { CacheControl, ContentType} = blobObj.headers;
      blobHTTPHeaders.blobCacheControl = CacheControl;
      blobHTTPHeaders.blobContentType = ContentType;
    }
    //const localFilePath = path.resolve(dist, file);
    const localFilePath = absFile;
    await blockBlobClient.uploadFile(localFilePath, { blobHTTPHeaders });
  }));
}
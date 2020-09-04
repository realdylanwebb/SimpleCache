# SimplyCache
SimplyCache is a stream based file server cache for NodeJS that can cache files
explicitly or implicitly using a least recently used cache. Cached files are all
instances of Node's Stream.Duplex() interface and can be streamed from by multiple
requests at a time, or written to using a pipe or pipeline. Compression and encoding
transformation can easily be achieved by passing a vector of transform streams to 
SimplyCache. SimplyCache will pipe the file stream through those streams before caching, and
propogate associated errors. Files cached explicitly will remain cached until they are
explicitly purged. While files that are implicitly cached will be purged as the least
recently used cache reaches a max files limit. Least recently used files are purged first.

## Options

#### pipelineV
A vector of objects implementing the Stream.Duplex or Stream.Transform interface. Default: NULL.
The file read stream is piped through these before caching. Useful for, but not limited to, 
compression streams and transfering encoding.

#### maxFiles
An integer value, default 10 files. The maximum amount of files that can exist in the LRU portion of
the cache before purging the least recently used.
This option does not limit the amount of files cached by SimplyCache.cache(path),
only files cached implicitly by SimplyCache.stream(path).

#### chunkSize
An integer value, default 256 bytes.
This is used as the buffer size per chunk from the readable end of a SimplyCache stream.

## Notice
This is very much a work in progress, and is not yet ready for production usage.

## How to Use

Create the SimplyCache object.
```javascript
const sc = require("simplycache");
cache = new sc();
```

Caching a file:
```javascript
let cacheStream = sc.cache(filePath);
```

Retrieving a file that may or may not be in the cache:
```javascript
let cacheStream = sc.stream(filePath);
```

Removing one or all files:
```javascript
//Removing one file
sc.purge(filePath);
//Removing all files
sc.purge();
```

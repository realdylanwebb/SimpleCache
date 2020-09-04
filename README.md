# SimpleCache
A stream based LRU and explicit cache for NodeJS

## Notice
This is still a work in progress and is not ready for production usage.

## How to Use

Create the SimplyCache object.
```
const sc = require("simplycache");
cache = new sc();
```

Caching a file:
```
let cacheStream = sc.cache(filePath);
```

Retrieving a file that may or may not be in the cache:
```
let cacheStream = sc.stream(filePath);
```

Removing one or all files:
```
//Removing one file
sc.purge(filePath);
//Removing all files
sc.purge();
```

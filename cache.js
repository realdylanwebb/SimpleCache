/*
*   Copyright (c) Dylan Webb
*   This file and its contents are subject to the terms and conditions enumerated
*   in the file 'LICENSE'. Which is to be destributed with this source or binary package.
*
*   Design Goals
*   *Implements the stream.Duplex interface
*   *Simple, highly configurable interface with one options object.
*   *Great error handling
*   *Can explicitly cache files
*   *Should pipeline streams under the hood to cache files
*
*   Potential enhacements
*   *Test vanilla js vectors vs linked lists vs object buffers for the lru cache
*
*   API
*   Class SimplyCache(?options)
*   sc.stream(path)::Object CacheStream, extends stream.Duplex | error
*   sc.cache(path)::Object CacheStream, extends stream.Duplex | error
*   sc.purge(?path)::null | error
*
*   This module aims to provide a robust and easy to use caching system.
*   Under the hood, there is an LRU cache and an explicit cache.
*   The LRU cache is used implicitly whenever a file that is not already cached
*   is requested by SimplyCache.stream(path).
*   Files that are explicitly cached using SimplyCache.cache(path) will be ignored by the LRU cache.
*/

/* jshint esversion:9 */

const stream = require("stream");
const fs = require("fs");
const { StringDecoder } = require("string_decoder");
const kSource = Symbol("source");


/*
*   OPTIONS:
*
*   pipelineV::[implements stream.Duplex], default null.
*   a vector of duplex streams to pipe the file through before caching,
*   useful for, but not limited to, compression streams and sanitizing file data.
*
*   maxFiles::int, default 10.
*   The maximum amount of files that can exist in the LRU portion of the cache before
*   purging the least recently used.
*   This option does not limit the amount of files cached by SimplyCache.cache(path),
*   only files cached implicitly by SimplyCache.stream(path).
*
*   ChunkSize::int, default 256.
*   Buffer size per chunk from the readable end of a simplycache stream.
*/

class SimplyCache {
    constructor({pipelineV = null, chunkSize=256, maxFiles=10}) {
        this.map = new Map();
        this.lru = [];
        this.maxFiles = maxFiles;
        this.chunkSize = chunkSize;
        this.pipelineV = pipelineV; 
    }

    async _checkPurge() {
        while (this.lru.size < this.maxFiles) {
            this.map.delete(this.lru[this.lru.length]);
            this.lru.pop();
        }
    }

    async _lruUpdate(path) {
        let i = this.lru.indexOf(path);
        if (i === -1) {
            return null;
        } else {
            let first = this.lru.slice(-(i-1));
            let second = this.lru.slice(0, i);
            let el = this.lru[i];
            this.lru = first.concat(second);
            this.lru.push(el);
            return null;
        }
    }

    stream(path) {
        /* IS THE FILE CACHED OR CACHING? */
        if (this.map.has(path)) {
            this._lruUpdate(path);
            return this.map.get(path);
        } else {
            /* CACHE THE FILE */
            let cached = new CacheStream(null);
            let rs = fs.createReadStream(path);
            if (this.tPipeline !== null) {
                stream.pipeline(rs, this.pipelineV, cached);
            } else {
                rs.pipe(cached);
            }
            this.map.set(path, cached);
            this.lru.push(path);
            this._checkPurge();
            return cached;
        }
        
    }

    async cache(path) {
        let cached = new CacheStream(null);
        let rs = fs.createReadStream(path);
        if (this.pipelineV !== null) {
            stream.pipeline(rs, this.pipelineV, cached);
        } else {
            rs.pipe(cached);
        }
        this.map.set(path, cached);
        return cached;
    }

    async purge({path = null}) {
        if (path !== null) {
            /* PURGE SPECIFIC FILE */
            this.map.remove(path);
            
            let i = this.lru.indexOf(path);
            if (i !== -1) {
                let first = this.lru.slice(-(i-1));
                let second = this.lru.slice(0, i);
                this.lru = first.concat(second);
            }

        } else {
            /* PURGE IT ALL */
            this.map.forEach((buffer, path) => {
                this.map.remove(path);
            });
            this.lru = [];
        } 
    }
}


class CacheStream extends stream.Duplex {
    constructor(options) {
        super(options);
        this._decoder = new StringDecoder(options && options.defaultEncoding);
        this.buffer = Buffer.alloc(0);
        this.offset = 0;
    }

    /* SEE STREAM WRITABLE */

    //THIS PART IS A MESS AND PERFORMS TERRIBLY I WILL FIX SOON
    _write(chunk, encoding, callback) {
        if (encoding === "buffer") {
            chunk = this._decoder.write(chunk);
        }
        this.buffer = Buffer.concat([this.buffer, chunk]);
        callback();
    }

    _writev(chunks, callback) {

    }

    _final(callback) {
        this.buffer = Buffer.concat([this.buffer, this._decoder.end()]);
        callback();
    }

    /* SEE STREAM READABLE */

    _read(size) {

    }

    _destroy(err, callback) {

    }

}
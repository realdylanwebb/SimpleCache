/*
*   Copyright (c) Dylan Webb
*   This file and its contents are subject to the terms and conditions enumerated
*   in the file 'LICENSE'. Which is to be destributed with this source or binary package.
*
*   Design Goals
*   *Implements the stream.Duplex interface
*   *No data copies
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
*   sc.stream(path)::CacheStream{instanceOf(stream.Duplex)}
*   sc.cache(path)::promise::resolve->null::reject->error
*   sc.purge(?path)::err | null
*
*   This module aims to provide a robust and easy to use caching system.
*   It implements all JS control-flow styles except for callbacks :).
*   Maybe in a future version it will do that too.
*/

/* jshint esversion:9 */

const stream = require("stream");
const fs = require("fs");
const kSource = Symbol("source");

/*
*   tPipeline is a interface used to transform file data before caching.
*   tPipeline is to accept a file path as it's first constructor argument,
*   and is to implement the stream Readable, Duplex, Transform, or Passthrough interface.   
*/

class SimplyCache {
    constructor(options, {tPipeline = null}) {
        this.map = new Map();
        this.lru = [];
        this.maxFiles = options.maxFiles;
        this.tPipeline = tPipeline; 
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
            if (this.tPipeline !== null) {
                let ts = new this.tPipeline(path);
                ts.pipe(cached);
            } else {
                let rs = fs.createReadStream(path);
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
        if (this.tPipeline !== null) {
            let ts = new this.tPipeline(path);
            ts.pipe(cached);
        } else {
            let rs = fs.createReadStream(path);
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


/* Read it and weep nerd */
class CacheStream extends stream.Duplex {
    constructor(options) {
        super(options);
        this.offset = 0;
    }

    /* SEE STREAM WRITABLE */

    _write(chunk, encoding, callback) {

    }

    _writev(chunks, callback) {

    }

    _final(callback) {

    }

    /* SEE STREAM READABLE */

    _read(size) {

    }

    _destroy(err, callback) {

    }

}
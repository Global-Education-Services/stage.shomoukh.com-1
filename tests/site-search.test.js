import test from 'node:test';
import assert from 'node:assert/strict';
import {searchWebsite} from '../site/search.js';
test('site search resolves real contact, registration and facility topics without substring redirects',()=>{
 for(const [query,path] of [['contact page','/contact.html'],['registration','/admissions.html'],['facilities','/spaces.html']])assert.ok(searchWebsite(query).some(result=>result.url.startsWith(path)),query);
});
test('empty and unmatched search queries return no invented page',()=>{
 assert.deepEqual(searchWebsite(''),[]);assert.deepEqual(searchWebsite('xyzzyunpublished123'),[]);
});
test('site search deduplicates public sources and never constructs URLs from visitor HTML',()=>{
 const found=searchWebsite('programs');assert.ok(found.length);assert.equal(new Set(found.map(result=>result.url)).size,found.length);
 for(const result of searchWebsite('<script>programs</script>'))assert.ok(!/[<>]/.test(result.url));
});

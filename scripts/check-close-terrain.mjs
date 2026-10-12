import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../',import.meta.url);
const regions = JSON.parse(await readFile(new URL('scripts/terrain-regions.json',root)));
const relief = JSON.parse(await readFile(new URL('dist/data/relief.json',root)));
const content = JSON.parse(await readFile(new URL('dist/data/books/isaiah-native-content.json',root)));
const latitude = (y,z) => Math.atan(Math.sinh(Math.PI*(1-2*y/2**z)))*180/Math.PI;
let count=0;
assert.equal(relief.closeDetail?.length,regions.length,'Every terrain region needs a map layer');
for (const region of regions) {
  const layer=relief.closeDetail.find(layer=>layer.id===region.id);
  assert(layer,`Missing layer: ${region.id}`);
  assert.equal(layer.maxNativeZoom,region.zoom);
  assert.equal(layer.minZoom,region.minZoom);
  const bounds=[[latitude(region.y1,region.zoom),region.x0/2**region.zoom*360-180],
    [latitude(region.y0,region.zoom),region.x1/2**region.zoom*360-180]];
  bounds.forEach((corner,i)=>corner.forEach((value,j)=>assert(Math.abs(layer.bounds[i][j]-value)<1e-9,`Bounds mismatch: ${region.id}`)));
  if (region.id === 'levant') {
    bounds.forEach((corner,i)=>corner.forEach((value,j)=>assert(Math.abs(relief.detail.bounds[i][j]-value)<1e-9,'The finer regional layer must cover the full existing detail area')));
  } else {
    const place=content.places.find(place=>place.id===region.id);
    assert(place && place.lat>bounds[0][0] && place.lat<bounds[1][0] && place.lng>bounds[0][1] && place.lng<bounds[1][1],`Close terrain must contain its named place: ${region.id}`);
  }
  for (let z=region.minZoom; z<=region.zoom; z++) {
    const factor=2**(region.zoom-z);
    for (let x=region.x0/factor; x<region.x1/factor; x++) {
      await Promise.all(Array.from({length:(region.y1-region.y0)/factor},async (_,i)=>{
        const y=region.y0/factor+i;
        const path=layer.url.replace('{z}',z).replace('{x}',x).replace('{y}',y);
        const png=await readFile(new URL(`dist/${path}`,root));
        assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`Invalid PNG: ${path}`);
        assert.equal(png.readUInt32BE(16),256,`Wrong tile width: ${path}`);
        assert.equal(png.readUInt32BE(20),256,`Wrong tile height: ${path}`);
        assert.equal(png.subarray(-8,-4).toString(),'IEND',`Incomplete PNG: ${path}`);
        count++;
      }));
    }
  }
}
console.log(`Close terrain passed: ${count} tiles, complete coverage, matching bounds, zoom levels 11–14.`);

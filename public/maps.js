// Map assets are local; tiles load from OpenStreetMap France only when a map is opened.
export const CAMPUS=[51.090953,71.418383];
let leafletReady;
function loadLeaflet(){
  if(globalThis.L)return Promise.resolve(globalThis.L);
  if(!leafletReady)leafletReady=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-campus-map]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/leaflet/leaflet.css';css.dataset.campusMap='';document.head.append(css);
    }
    const script=document.createElement('script');script.src='/vendor/leaflet/leaflet.js';
    script.onload=()=>resolve(globalThis.L);
    script.onerror=()=>{script.remove();leafletReady=undefined;reject(new Error('The map could not load. You can enter coordinates below.'));};
    document.head.append(script);
  });
  return leafletReady;
}
export function hasCoordinates(item){
  return typeof item.latitude==='number' && typeof item.longitude==='number' && Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && Math.abs(item.latitude)<=90 && Math.abs(item.longitude)<=180;
}
export function mapLinksMarkup(item){
  if(!hasCoordinates(item))return '';
  const lat=item.latitude.toFixed(6),lng=item.longitude.toFixed(6);
  return `<a href="https://2gis.kz/astana/geo/${lng},${lat}" target="_blank" rel="noopener noreferrer">Open in 2GIS ↗</a><a href="https://www.google.com/maps/search/?api=1&amp;query=${lat},${lng}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>`;
}
function markerIcon(L){
  return L.divIcon({className:'campus-pin',html:'<svg viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27.1 16 41 16 41s15-13.9 15-25.2C31 7.6 24.3 1 16 1Z" fill="#8e3f5c" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5" fill="#f7dce5"/></svg>',iconSize:[32,42],iconAnchor:[16,42]});
}
function addTiles(L,map,onError){
  const tiles=L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, tiles <a href="https://www.openstreetmap.fr/" target="_blank" rel="noopener noreferrer">OSM France</a>, style <a href="https://www.hotosm.org/" target="_blank" rel="noopener noreferrer">HOT</a>'
  }).addTo(map);
  let warned=false;
  tiles.on('tileerror',()=>{if(!warned){warned=true;onError?.('Map tiles are unavailable. Enter coordinates below or open the point in 2GIS.');}});
}
export function createLocationPicker(){
  const $=id=>document.getElementById(id);
  let map,marker,point=null,opening=false;
  function update(){
    $('clear-map').hidden=!point;$('draft-map-links').hidden=!point;
    $('draft-map-links').innerHTML=point?mapLinksMarkup(point):'';
    $('map-latitude').value=point?point.latitude.toFixed(6):'';
    $('map-longitude').value=point?point.longitude.toFixed(6):'';
    $('map-status').textContent=point?'Pin selected. Drag it or tap another spot to adjust.':'Tap the map to add a pin. You can drag the pin to adjust it.';
  }
  function setPoint(latitude,longitude){
    point={latitude:Number(latitude.toFixed(6)),longitude:Number(longitude.toFixed(6))};
    if(map){
      const L=globalThis.L;
      if(marker)marker.setLatLng([point.latitude,point.longitude]);
      else{
        marker=L.marker([point.latitude,point.longitude],{icon:markerIcon(L),draggable:true,alt:'Selected item location',title:'Drag to adjust the location'}).addTo(map);
        marker.on('dragend',()=>{const ll=marker.getLatLng();setPoint(ll.lat,ll.lng);});
      }
    }
    $('coordinates-error').textContent='';update();
  }
  async function open(){
    if(opening)return;opening=true;$('report-map-wrap').hidden=false;$('open-map').textContent='Loading map…';
    try{
      const L=await loadLeaflet();
      if(!map){
        map=L.map('report-map',{scrollWheelZoom:false}).setView(CAMPUS,17);
        addTiles(L,map,message=>$('map-status').textContent=message);
        map.on('click',event=>setPoint(event.latlng.lat,event.latlng.lng));
        if(point)setPoint(point.latitude,point.longitude);
      }
      requestAnimationFrame(()=>map.invalidateSize());$('open-map').hidden=true;
    }catch(error){$('map-status').textContent=error.message;$('open-map').textContent='Retry map';}
    finally{opening=false;}
  }
  $('open-map').addEventListener('click',open);
  $('map-campus').addEventListener('click',()=>map?.setView(CAMPUS,17));
  $('map-center').addEventListener('click',()=>{if(map){const ll=map.getCenter();setPoint(ll.lat,ll.lng);}else $('map-status').textContent='Enter coordinates below to choose a point.';});
  $('apply-coordinates').addEventListener('click',()=>{
    const latitude=$('map-latitude').value,longitude=$('map-longitude').value;
    const candidate={latitude:Number(latitude),longitude:Number(longitude)};
    if(latitude===''||longitude===''||!hasCoordinates(candidate)){
      $('coordinates-error').textContent='Enter a latitude from −90 to 90 and longitude from −180 to 180.';$('map-latitude').focus();return;
    }
    setPoint(candidate.latitude,candidate.longitude);map?.setView([candidate.latitude,candidate.longitude],17);
  });
  function reset(){point=null;if(marker){marker.remove();marker=null;}update();$('coordinates-error').textContent='';}
  $('clear-map').addEventListener('click',reset);
  return {value:()=>point?{...point}:{latitude:null,longitude:null},reset,resize:()=>{if(map)requestAnimationFrame(()=>map.invalidateSize());}};
}
export async function showItemMap(element,item){
  if(!element||!hasCoordinates(item))return null;
  try{
    const L=await loadLeaflet();if(!element.isConnected)return null;
    const map=L.map(element,{scrollWheelZoom:false}).setView([item.latitude,item.longitude],17);
    addTiles(L,map,message=>{const status=element.parentElement?.querySelector('.map-status');if(status)status.textContent=message;});
    L.marker([item.latitude,item.longitude],{icon:markerIcon(L),alt:'Item location',title:'Saved item location'}).addTo(map);
    requestAnimationFrame(()=>map.invalidateSize());return map;
  }catch{
    element.textContent='Map preview is unavailable. Open the saved point using the links below.';
    return null;
  }
}

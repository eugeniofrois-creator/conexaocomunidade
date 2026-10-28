(() => {
 const params=new URLSearchParams(location.search),lat=Number(params.get('lat')),lng=Number(params.get('lng'));
 const aviso=document.getElementById('aviso');
 if(!params.has('lat')||!params.has('lng')||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){aviso.hidden=false;aviso.textContent='Localização não informada.';return;}
 const map=L.map('mapa',{scrollWheelZoom:false}).setView([lat,lng],16);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).on('tileerror',()=>{aviso.hidden=false;aviso.textContent='Não foi possível carregar as ruas. Use o botão de trajeto para abrir a localização.';}).addTo(map);
 L.circleMarker([lat,lng],{radius:10,color:'#fff',weight:3,fillColor:'#126654',fillOpacity:1}).addTo(map).bindTooltip('Local do comércio');
})();

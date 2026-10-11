"""Render actual OSM geometry and precomputed pedestrian routes as static maps.
No basemap street, coastline, or route is generated or drawn freehand.
"""
import argparse, html, json, math, time, urllib.parse, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--data',type=Path,default=ROOT/'.map-cache/osm-cannes.json')
parser.add_argument('--routes',type=Path,default=ROOT/'assets/cannes-routes.json')
parser.add_argument('--out',type=Path,default=ROOT/'assets')
args=parser.parse_args()
if not args.data.exists():
    query='[out:json][timeout:60];(way["highway"](43.498,6.933,43.566,7.026);way["natural"="coastline"](43.498,6.933,43.566,7.026);way["natural"="water"](43.498,6.933,43.566,7.026);way["landuse"~"forest|grass|meadow|recreation_ground"](43.498,6.933,43.566,7.026);way["natural"~"wood|scrub|beach"](43.498,6.933,43.566,7.026);way["leisure"="park"](43.498,6.933,43.566,7.026););out geom;'
    for attempt,host in enumerate(['overpass-api.de','overpass.kumi.systems','overpass-api.de']):
        try:
            url='https://'+host+'/api/interpreter?'+urllib.parse.urlencode({'data':query})
            req=urllib.request.Request(url,headers={'User-Agent':'CrossRun-map/1.0 (+https://crossrunapp.fr)'})
            raw=urllib.request.urlopen(req,timeout=100).read()
            json.loads(raw)
            args.data.parent.mkdir(parents=True,exist_ok=True);args.data.write_bytes(raw);break
        except Exception:
            if attempt==2:raise
            time.sleep(3)
osm=json.loads(args.data.read_text())['elements']
routes=json.loads(args.routes.read_text())
args.out.mkdir(parents=True,exist_ok=True)

def mercator(p):
    lon,lat=p
    return math.radians(lon),math.log(math.tan(math.pi/4+math.radians(lat)/2))
def coordinate(w):return [(p['lon'],p['lat']) for p in w['geometry']]
coast=[coordinate(w) for w in osm if w.get('tags',{}).get('natural')=='coastline']
chains=[]
while coast:
    chain=coast.pop();changed=True
    while changed:
        changed=False
        for i,c in enumerate(coast):
            if chain[-1]==c[0]:chain+=c[1:]
            elif chain[-1]==c[-1]:chain+=c[-2::-1]
            elif chain[0]==c[-1]:chain=c[:-1]+chain
            elif chain[0]==c[0]:chain=c[:0:-1]+chain
            else:continue
            coast.pop(i);changed=True;break
    chains.append(chain)
main_coast=max(chains,key=len)
if main_coast[0][1]>main_coast[-1][1]:main_coast.reverse()

def render(name,bounds,focus=False):
    W,H=1000,930
    west,south,east,north=bounds
    x0,y0=mercator((west,south));x1,y1=mercator((east,north))
    scale=min(W/(x1-x0),H/(y1-y0));cx=(x0+x1)/2;cy=(y0+y1)/2
    def xy(p):
        x,y=mercator(p);return W/2+(x-cx)*scale,H/2-(y-cy)*scale
    def path(points):
        pixels=[xy(p) for p in points]; kept=[]
        for p in pixels:
            if not kept or math.hypot(p[0]-kept[-1][0],p[1]-kept[-1][1])>.5:kept.append(p)
        if len(kept)<2:return ''
        return 'M'+'L'.join(f'{x:.1f},{y:.1f}' for x,y in kept)
    def visible(points):
        return any(west-.004<=p[0]<=east+.004 and south-.004<=p[1]<=north+.004 for p in points)
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Carte OpenStreetMap de Cannes avec deux parcours piétons réels et un kilomètre commun"><rect width="1000" height="930" fill="#c7e9f2"/><g stroke-linecap="round" stroke-linejoin="round">']
    land=main_coast+[(8,46),(5,46),(5,42)]
    out.append(f'<path d="{path(land)}Z" fill="#f5f5ef"/>')
    for w in osm:
        tags=w.get('tags',{});points=coordinate(w)
        if tags.get('highway') or not visible(points):continue
        if tags.get('natural')=='coastline':continue
        color='#dcead4'
        if tags.get('natural')=='water':color='#c7e9f2'
        elif tags.get('natural')=='beach':color='#eee6cc'
        elif tags.get('natural')=='scrub':color='#e5eddc'
        if points[0]==points[-1]:out.append(f'<path d="{path(points)}Z" fill="{color}"/>')
    roads=[w for w in osm if w.get('tags',{}).get('highway') and visible(coordinate(w))]
    allowed={'primary':6,'secondary':5,'tertiary':4,'residential':2.3,'unclassified':2.2,'living_street':2,'pedestrian':2,'service':1.2,'footway':1.2,'path':1.1,'steps':1.1,'cycleway':1.3,'track':1.1}
    for casing in [True,False]:
        for w in roads:
            t=w['tags'];kind=t['highway']
            if kind not in allowed:continue
            width=allowed[kind]*(1.15 if focus else .8)
            color='#d1d7d2' if casing else '#fff'
            if kind in ['footway','path','track','steps','cycleway']:
                if casing:continue
                color='#b9cab1'
            out.append(f'<path d="{path(coordinate(w))}" fill="none" stroke="{color}" stroke-width="{width+(1 if casing else 0):.1f}"/>')
    for c in chains:
        if visible(c):out.append(f'<path d="{path(c)}" fill="none" stroke="#94c8d5" stroke-width="1.4"/>')
    for key,color in [('paul','#f05e68'),('laura','#1769ff'),('common','#e5ab00')]:
        d=path(routes[key]);width=8 if focus else 6
        if key=='common':width+=2
        out.extend([f'<path d="{d}" fill="none" stroke="#fff" stroke-width="{width+5}"/>',f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}"/>'])
    def text(p,label,size=23,color='#5b6b7f',dx=0,dy=0):
        x,y=xy(p)
        out.append(f'<text x="{x+dx:.1f}" y="{y+dy:.1f}" fill="{color}" font-family="Arial,sans-serif" font-size="{size}" font-weight="700" stroke="#fff" stroke-width="4" paint-order="stroke">{html.escape(label)}</text>')
    def pin(p,label,color,dx=15,dy=-55):
        x,y=xy(p);width=round(len(label)*16+40)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="10" fill="{color}" stroke="#fff" stroke-width="5"/>')
        bx=max(8,min(W-width-8,x+dx));by=max(10,min(H-125,y+dy))
        out.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{width}" height="42" rx="12" fill="#fff" stroke="{color}" stroke-width="2"/>')
        out.append(f'<text x="{bx+14:.1f}" y="{by+28:.1f}" fill="#14263b" font-family="Arial,sans-serif" font-size="22" font-weight="700">{html.escape(label)}</text>')
    if focus:
        text((6.989,43.5605),'Croix des Gardes',26,'#65885c',-100,-4)
        text((6.976,43.5516),'Cannes-La Bocca',24,dx=-60)
        text((6.9983,43.5548),'Av. Jean de Noailles',17,dx=-40)
        text((6.9821,43.5592),'Bd de Roquebillière',17,dx=-80)
        pin(routes['start'],'Laura · départ / retour','#1769ff',-240,70)
        pin(routes['end'],'Les parcours se séparent','#e5ab00',-130,50)
        middle=routes['common'][len(routes['common'])//2]
        pin(middle,'1 000 m au même moment','#e5ab00',75,150)
    else:
        text((6.9433,43.52354),'La Napoule',23,dx=-10,dy=-20)
        text((6.981,43.552),'Cannes-La Bocca',23,dx=-100)
        text((6.990,43.5605),'Croix des Gardes',23,dx=-70)
        text((6.968,43.520),'BAIE DE CANNES',28,'#639caf',dx=-20)
        pin(routes['paul'][0],'Paul · Théoule','#f05e68',-180,-65)
        pin(routes['paul'][-1],'Paul · Cannes','#f05e68',-185,35)
        pin(routes['start'],'Laura · La Bocca','#1769ff',-240,35)
        pin(routes['end'],'1 km en commun','#e5ab00',-20,90)
    metres=500 if focus else 1000
    bar=scale*metres/(6371000*math.cos(math.radians((south+north)/2)))
    out.append(f'<rect x="15" y="14" width="{bar+34:.1f}" height="52" rx="9" fill="#fff" opacity=".94"/><path d="M30 42H{30+bar:.1f}M30 36V48M{30+bar:.1f} 36V48" fill="none" stroke="#5b6b7f" stroke-width="2"/><text x="30" y="31" font-family="Arial,sans-serif" font-size="15" fill="#5b6b7f">{metres} m</text>')
    out.append('</g><rect x="0" y="894" width="1000" height="36" fill="#fff" opacity=".92"/><text x="15" y="918" font-family="Arial,sans-serif" font-size="15" fill="#5b6b7f">© OpenStreetMap contributors · Parcours piétons calculés avec Valhalla</text></svg>')
    (args.out/name).write_text(''.join(out))

render('cannes-real-overview.svg',(6.932,43.500,7.024,43.565))
render('cannes-real-focus.svg',(6.974,43.543,7.004,43.564),True)
for name in ['paul','laura']:
    points=''.join(f'<trkpt lat="{lat:.7f}" lon="{lon:.7f}"/>' for lon,lat in routes[name])
    (args.out/f'cannes-{name}.gpx').write_text(f'<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="CrossRun – Valhalla / OpenStreetMap" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>{name.title()} – Cannes</name><trkseg>{points}</trkseg></trk></gpx>')
assert abs(routes['metrics']['common_m']-1000)<.01
print('Real OSM maps generated:',routes['metrics'])

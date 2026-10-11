"""Render OSM coast and roads with a Valhalla pedestrian group challenge route.
The 120 km progress is an explicitly illustrative cumulative group distance.
Usage: python scripts/build-group-map.py --data osm.json --route route-response.json
"""
import argparse, json, math, html
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--data',type=Path,required=True)
p.add_argument('--route',type=Path,required=True)
p.add_argument('--out',type=Path,default=Path(__file__).resolve().parent.parent/'assets')
a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
def decode(s):
    out=[];i=0;lat=lon=0
    while i<len(s):
        values=[]
        for _ in range(2):
            value=shift=0
            while True:
                b=ord(s[i])-63;i+=1;value|=(b&31)<<shift;shift+=5
                if b<32:break
            values.append(~(value>>1) if value&1 else value>>1)
        lat+=values[0];lon+=values[1];out.append([lon/1e6,lat/1e6])
    return out
def distance(u,v):
    p,q=math.radians(u[1]),math.radians(v[1]);dl=math.radians(v[0]-u[0])
    return 12742000*math.asin(math.sqrt(math.sin((q-p)/2)**2+math.cos(p)*math.cos(q)*math.sin(dl/2)**2))
responses=json.loads(a.route.read_text());route=[]
if isinstance(responses,dict):
    route=responses['route']
else:
    for response in responses:
        for leg in response['trip']['legs']:
            coords=decode(leg['shape']);route+=coords if not route else coords[1:]
total=sum(distance(u,v) for u,v in zip(route,route[1:]));goal=round(total/1000)
progress=120000;walked=0;completed=[route[0]]
for u,v in zip(route,route[1:]):
    length=distance(u,v)
    if walked+length>=progress:
        t=(progress-walked)/length;completed.append([u[k]+t*(v[k]-u[k]) for k in range(2)]);break
    completed.append(v);walked+=length
W,H=1000,650;west,south,east,north=5.19,43.04,7.18,43.80
def mercator(pt):return math.radians(pt[0]),math.log(math.tan(math.pi/4+math.radians(pt[1])/2))
x0,y0=mercator((west,south));x1,y1=mercator((east,north));scale=min(W/(x1-x0),(H-35)/(y1-y0));cx=(x0+x1)/2;cy=(y0+y1)/2
def xy(pt):
    x,y=mercator(pt);return W/2+(x-cx)*scale,(H-35)/2-(y-cy)*scale
def path(points):
    kept=[]
    for pt in points:
        q=xy(pt)
        if not kept or math.hypot(q[0]-kept[-1][0],q[1]-kept[-1][1])>1.1:kept.append(q)
    return 'M'+'L'.join(f'{x:.1f},{y:.1f}' for x,y in kept) if len(kept)>1 else ''
elements=json.loads(a.data.read_text())['elements']
coasts=[[(p['lon'],p['lat']) for p in w['geometry']] for w in elements if w.get('tags',{}).get('natural')=='coastline']
chains=[]
while coasts:
    chain=coasts.pop();changed=True
    while changed:
        changed=False
        for i,c in enumerate(coasts):
            if chain[-1]==c[0]:chain+=c[1:]
            elif chain[-1]==c[-1]:chain+=c[-2::-1]
            elif chain[0]==c[-1]:chain=c[:-1]+chain
            elif chain[0]==c[0]:chain=c[:0:-1]+chain
            else:continue
            coasts.pop(i);changed=True;break
    chains.append(chain)
main=max(chains,key=len)
if main[0][0]>main[-1][0]:main.reverse()
out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Défi de groupe Cannes Marseille sur une vraie carte OpenStreetMap, 120 kilomètres cumulés illustrés"><rect width="1000" height="650" fill="#d6edf3"/><g stroke-linecap="round" stroke-linejoin="round">']
out.append(f'<path d="{path(main+[(8,46),(4,46)])}Z" fill="#f3f5ef"/>')
for c in chains:
    if c==main:continue
    if c[0]==c[-1] and path(c):out.append(f'<path d="{path(c)}Z" fill="#f3f5ef"/>')
road_paths=[]
for w in elements:
    kind=w.get('tags',{}).get('highway')
    if kind not in ['motorway','trunk','primary']:continue
    coords=[(p['lon'],p['lat']) for p in w['geometry']]
    d=path(coords)
    if d:road_paths.append(d)
out.append(f'<path d="{"".join(road_paths)}" fill="none" stroke="#d4dbd2" stroke-width="1.3"/>')
coast_paths=''.join(path(c) for c in chains)
out.append(f'<path d="{coast_paths}" fill="none" stroke="#a2cdd8" stroke-width="1"/>')
for pts,color,width in [(route,'#fff',9),(route,'#bcc9d7',5),(completed,'#fff',10),(completed,'#1769ff',6)]:
    out.append(f'<path d="{path(pts)}" fill="none" stroke="{color}" stroke-width="{width}"/>')
def label(pt,text,size=24,dx=0,dy=0,color='#6c7c8b'):
    x,y=xy(pt);out.append(f'<text x="{x+dx:.1f}" y="{y+dy:.1f}" font-family="Arial,sans-serif" font-size="{size}" font-weight="700" fill="{color}" stroke="#fff" stroke-width="4" paint-order="stroke">{html.escape(text)}</text>')
label((6.73,43.433),'Fréjus',21,-20,35)
label((6.061,43.405),'Brignoles',21,-45,35)
label((5.571,43.293),'Aubagne',21,-30,33)
label((5.932,43.123),'Toulon',21,-25,10)
label((6.39,43.21),'MÉDITERRANÉE',23,-25,70,'#7ea8b5')
for pt,name,dx,dy in [(route[0],'Cannes',-65,-24),(route[-1],'Marseille',-65,-25)]:
    x,y=xy(pt);out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="#fff" stroke="#1769ff" stroke-width="4"/>');label(pt,name,28,dx,dy,'#14263b')
x,y=xy(completed[-1]);out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="19" fill="#1769ff" stroke="#fff" stroke-width="5"/><text x="{x:.1f}" y="{y+6:.1f}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#fff">5</text>')
label(completed[-1],'Votre groupe',23,-55,-30,'#1769ff')
out.append('</g><rect y="615" width="1000" height="35" fill="#fff" opacity=".9"/><text x="18" y="638" font-family="Arial,sans-serif" font-size="14" fill="#6c7c8b">© OpenStreetMap contributors · Itinéraire piéton calculé avec Valhalla</text></svg>')
(a.out/'cannes-marseille-group.svg').write_text(''.join(out))
(a.out/'cannes-marseille-group.json').write_text(json.dumps({'source':'OpenStreetMap / Valhalla pedestrian','route':route,'route_m':round(total),'goal_km':goal,'example_group_km':120,'members':[{'name':n,'km':k} for n,k in [('Paul',32),('Laura',27),('Noah',23),('Emma',20),('Hugo',18)]]},separators=(',',':')))
print(json.dumps({'goal_km':goal,'route_m':round(total),'progress_km':120,'percent':round(120/goal*100),'points':len(route)}))

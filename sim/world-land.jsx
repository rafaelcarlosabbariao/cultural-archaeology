// World landmass as simplified GeoJSON — low-res coastline polygons.
// Hand-drawn continental outlines; good enough for a stylized orthographic globe.

const WORLD_LAND = {
  type: 'FeatureCollection',
  features: [
    // North America (simplified)
    { type: 'Feature', properties: { name: 'NA' }, geometry: { type: 'Polygon', coordinates: [[
      [-168,65],[-155,71],[-140,70],[-125,70],[-100,73],[-80,70],[-65,60],[-55,52],[-60,47],[-68,44],[-70,42],[-75,38],[-80,32],[-83,29],[-80,25],[-88,30],[-95,29],[-98,26],[-103,23],[-109,23],[-115,29],[-112,32],[-117,33],[-123,39],[-126,48],[-130,54],[-138,59],[-150,59],[-158,57],[-165,60],[-168,65]
    ]]}},
    { type: 'Feature', properties: { name: 'Greenland' }, geometry: { type: 'Polygon', coordinates: [[
      [-45,60],[-30,60],[-22,70],[-25,78],[-38,83],[-55,82],[-60,75],[-55,65],[-45,60]
    ]]}},
    // South America
    { type: 'Feature', properties: { name: 'SA' }, geometry: { type: 'Polygon', coordinates: [[
      [-78,11],[-72,11],[-60,8],[-52,5],[-45,-1],[-38,-8],[-35,-15],[-40,-23],[-48,-28],[-58,-35],[-65,-42],[-70,-52],[-72,-55],[-73,-45],[-74,-38],[-71,-30],[-72,-20],[-78,-10],[-80,-4],[-80,0],[-78,11]
    ]]}},
    // Europe (Iberia→Scand)
    { type: 'Feature', properties: { name: 'EU' }, geometry: { type: 'Polygon', coordinates: [[
      [-10,36],[-6,37],[0,40],[5,43],[8,44],[12,38],[18,40],[25,37],[28,41],[24,45],[30,46],[40,48],[50,55],[55,60],[40,65],[25,66],[15,63],[10,58],[8,54],[3,51],[-4,48],[-10,43],[-10,36]
    ]]}},
    // Africa
    { type: 'Feature', properties: { name: 'AF' }, geometry: { type: 'Polygon', coordinates: [[
      [-17,15],[-10,11],[0,5],[10,4],[20,2],[30,-4],[35,-6],[40,-12],[40,-20],[35,-28],[28,-33],[20,-34],[15,-30],[12,-20],[10,-10],[0,-5],[-8,4],[-15,10],[-17,15]
    ]]}},
    // Asia (Arabia → Siberia → SE)
    { type: 'Feature', properties: { name: 'AS' }, geometry: { type: 'Polygon', coordinates: [[
      [35,12],[42,14],[50,25],[55,30],[60,25],[70,22],[78,10],[80,8],[90,20],[100,10],[105,5],[110,1],[112,6],[108,18],[115,22],[125,35],[130,42],[140,45],[150,55],[160,65],[170,68],[175,70],[180,72],[175,72],[140,72],[120,74],[100,78],[80,75],[60,70],[50,62],[45,55],[40,48],[35,40],[32,30],[35,12]
    ]]}},
    { type: 'Feature', properties: { name: 'India' }, geometry: { type: 'Polygon', coordinates: [[
      [68,25],[76,32],[80,28],[88,26],[92,22],[90,15],[82,8],[78,10],[72,15],[68,20],[68,25]
    ]]}},
    // SE Asia islands (merged)
    { type: 'Feature', properties: { name: 'SEA' }, geometry: { type: 'Polygon', coordinates: [[
      [95,6],[105,5],[115,0],[125,-3],[135,-6],[140,-8],[135,-10],[120,-9],[110,-8],[100,-1],[95,6]
    ]]}},
    { type: 'Feature', properties: { name: 'PH' }, geometry: { type: 'Polygon', coordinates: [[
      [120,18],[125,18],[126,10],[122,8],[118,10],[120,18]
    ]]}},
    { type: 'Feature', properties: { name: 'Japan' }, geometry: { type: 'Polygon', coordinates: [[
      [131,31],[140,36],[143,43],[145,45],[141,45],[135,36],[131,31]
    ]]}},
    // Australia
    { type: 'Feature', properties: { name: 'AU' }, geometry: { type: 'Polygon', coordinates: [[
      [115,-22],[125,-15],[135,-13],[142,-11],[145,-16],[151,-24],[153,-28],[150,-35],[140,-38],[130,-33],[118,-34],[115,-22]
    ]]}},
    { type: 'Feature', properties: { name: 'NZ' }, geometry: { type: 'Polygon', coordinates: [[
      [170,-36],[175,-38],[177,-42],[172,-46],[168,-44],[170,-36]
    ]]}},
    // UK/Ireland
    { type: 'Feature', properties: { name: 'UK' }, geometry: { type: 'Polygon', coordinates: [[
      [-6,50],[-3,51],[1,52],[2,55],[-2,58],[-5,58],[-8,55],[-10,53],[-6,50]
    ]]}},
  ],
};

window.WORLD_LAND = WORLD_LAND;

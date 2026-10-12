// Builds the built-in pictures and sounds into media/ (run: npm run media -- [path to a Khatfa checkout]).
// · Flags: flag-icons (MIT; national flag designs themselves are not copyrightable)
// · Country outlines: Natural Earth 1:50m shapes (public domain) via world-atlas (ISC), drawn with d3-geo
// · Sounds: the CC0 recordings (Kenney; Ben Burnes / Abstraction) and generated tones that the owner's
//   Khatfa game already ships, copied from a Khatfa checkout at build time. Nothing is loaded from
//   Khatfa at runtime. Licences are copied into media/licenses/.
// Files get neutral content-hash names so a file name never gives a response away.
// Writes src/bank/02-media.js: JB_BANK.media = { key: 'media/…' }. Clues use m.src = '@key'.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const out = path.join(root, 'media');
const KHATFA = process.argv[2] || path.join(root, '..', 'sad-cpu141', 'khatfa');
const map = {};
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
function save(key, dir, ext, buf) {
  const name = sha(buf) + ext;
  fs.mkdirSync(path.join(out, dir), { recursive: true });
  fs.writeFileSync(path.join(out, dir, name), buf);
  map[key] = 'media/' + dir + '/' + name;
}

/* ---------------- flags ---------------- */
const FLAGS = ['jp', 'ca', 'br', 'it', 'kr', 'ch', 'ar', 'gr', 'jm', 'se', 'ke', 'pt', 'np', 'bt', 'kz', 'za', 'ki', 'sc', 'bz', 'kg'];
function flags() {
  const dir = path.join(root, 'node_modules/flag-icons/flags/4x3');
  FLAGS.forEach((cc) => {
    let svg = fs.readFileSync(path.join(dir, cc + '.svg'), 'utf8');
    svg = svg.replace(/\s+id="flag-icons-[a-z-]+"/, ''); // the id names the country
    save('flag-' + cc, 'i', '.svg', Buffer.from(svg));
  });
}

/* ---------------- country outlines ---------------- */
// [key, Natural Earth name, bounding box [lonMin, lonMax, latMin, latMax] for the familiar mainland outline (optional)]
const SHAPES = [['au', 'Australia', [112, 155, -45, -9]], ['in', 'India'], ['mx', 'Mexico'], ['gb', 'United Kingdom'], ['cl', 'Chile', [-80, -60, -60, -15]], ['fr', 'France', [-6, 10, 41, 52]],
  ['es', 'Spain', [-10, 5, 35, 45]], ['no', 'Norway', [4, 32, 57, 72]], ['vn', 'Vietnam'], ['mg', 'Madagascar'], ['nz', 'New Zealand', [165, 179, -48, -33]], ['th', 'Thailand'],
  ['cu', 'Cuba'], ['ua', 'Ukraine'], ['pe', 'Peru'], ['pl', 'Poland'], ['la', 'Laos'], ['py', 'Paraguay'], ['ni', 'Nicaragua'], ['hu', 'Hungary']];
async function shapes() {
  const d3 = await import('d3-geo');
  const topo = await import('topojson-client');
  const world = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/world-atlas/countries-50m.json'), 'utf8'));
  const all = topo.feature(world, world.objects.countries).features;
  const W = 800, H = 600;
  SHAPES.forEach(([key, name, box]) => {
    let f = all.find((x) => x.properties.name === name);
    if (!f) throw new Error('No country named ' + name);
    // Keep only the parts inside the box, so far-off islands and territories don't shrink the outline.
    if (box) {
      const inBox = (poly) => poly[0].every((c) => c[0] >= box[0] && c[0] <= box[1] && c[1] >= box[2] && c[1] <= box[3]);
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      f = { ...f, geometry: { type: 'MultiPolygon', coordinates: polys.filter(inBox) } };
      if (!f.geometry.coordinates.length) throw new Error('Box removed everything for ' + name);
    }
    const rotate = null;
    const proj = d3.geoMercator(); if (rotate) proj.rotate(rotate);
    proj.fitExtent([[40, 40], [W - 40, H - 40]], f);
    const p = d3.geoPath(proj).digits(1);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '"><path d="' + p(f) + '" fill="#f3e7c3" stroke="#b6f23d" stroke-width="3" stroke-linejoin="round"/></svg>';
    save('shape-' + key, 'i', '.svg', Buffer.from(svg));
  });
}

/* ---------------- sounds (copied from Khatfa's built-in media) ---------------- */
const SOUNDS = ['gs-cards', 'gs-door', 'gs-doorbell', 'gs-horn', 'gs-whistle', 'gs-siren', 'gs-coins', 'gs-scissors', 'gs-pencil', 'gs-smoke', 'gs-snow',
  'gs-reverse', 'gs-knife', 'gs-pot', 'gs-chips', 'gs-ratchet', 'gs-pills', 'gs-busy', 'gs-papercut', 'snd-clock', 'snd-dice'];
function sounds() {
  const mapFile = fs.readFileSync(path.join(KHATFA, 'src/bank/02-media.js'), 'utf8');
  SOUNDS.forEach((k) => {
    const m = mapFile.match(new RegExp('"' + k + '": "([^"]+)"'));
    if (!m) throw new Error('Khatfa has no sound ' + k);
    save(k.replace(/^gs-|^snd-/, 'snd-'), 'a', '.mp3', fs.readFileSync(path.join(KHATFA, m[1])));
  });
  const lic = path.join(out, 'licenses'); fs.mkdirSync(lic, { recursive: true });
  ['ben-burnes-cc0-packs.txt', 'kenney-casino-audio.txt', 'kenney-impact-sounds.txt', 'kenney-rpg-audio.txt', 'flag-icons-MIT.txt', 'world-atlas-ISC.txt']
    .forEach((f) => fs.copyFileSync(path.join(KHATFA, 'media/licenses', f), path.join(lic, f)));
}

(async () => {
  fs.rmSync(path.join(out, 'i'), { recursive: true, force: true });
  fs.rmSync(path.join(out, 'a'), { recursive: true, force: true });
  flags(); await shapes(); sounds();
  const keys = Object.keys(map).sort();
  const js = '/* Built-in media files, generated by tools/media.js — do not edit by hand.\n   Clues refer to them as m.src = \'@key\'. File names are content hashes. */\nJB_BANK.media = {\n' + keys.map((k) => ' ' + JSON.stringify(k) + ': ' + JSON.stringify(map[k])).join(',\n') + '\n};\n';
  fs.writeFileSync(path.join(root, 'src/bank/02-media.js'), js);
  console.log('media: ' + keys.length + ' files');
})();

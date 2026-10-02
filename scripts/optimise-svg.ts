// SVGO settings for the atlas, used by the Vite build (vite.config.ts) on the copies in dist/.
// The sources in public/scenes and src/icons stay readable: they carry the comments that explain how
// each scene is built and the validator (npm run validate) checks them as written.
//
// This is a short, explicit list, not SVGO's default preset, because the default would break the
// engine's contract with the scenes: it deletes the empty <text class="scene-label"> that the engine
// fills in, drops invisible shapes (the .hit tap targets), renames or removes ids (hotspot regions,
// the #icon-* sprite references), and removes `role`. What is left must not change what is drawn;
// `npm run compare` (scripts/compare-builds.ts) checks that against the unoptimised build, pixel by pixel.
//
// Tried and dropped, each measured on the scenes:
//   convertTransform / applyTransforms  folds rotations into path numbers; shifts edges by a fraction
//                                       of a pixel, and brotli compresses the result worse than before
//   cleanupNumericValues, collapseGroups, mergePaths, moveElemsAttrsToGroup   under 1% each
//   convertPathData's makeArcs, straightCurves, convertToQ   lossy within a tolerance of about a pixel
//   relative path coordinates           about 15% smaller after brotli, but Chrome adds them up in 32-bit floats, so a
//                                       few dozen edge pixels per scene change by a shade; absolute stays exact
import { optimize, type Config } from 'svgo'

const PRECISION = 3

export const SVGO_CONFIG: Config = {
  multipass: true,
  floatPrecision: PRECISION,
  plugins: [
    'removeDoctype',
    'removeXMLProcInst',
    'removeMetadata',
    'removeEditorsNSData',
    'cleanupAttrs',
    'convertColors',
    'removeEmptyAttrs',
    {
      name: 'convertPathData',
      // SVGO accepts `false` for makeArcs at run time; its types only describe the settings object.
      params: {
        floatPrecision: PRECISION,
        applyTransforms: false,
        makeArcs: false,
        straightCurves: false,
        convertToQ: false,
        smartArcRounding: false,
        forceAbsolutePath: true, // see above
      } as never,
    },
  ],
}

const PATH_DATA = /(<path\b[^>]*?\sd=")([^"]*)(")/g
const closings = (d: string) => (d.match(/[zZ]/g) ?? []).length

export function optimiseSvg(svg: string, path?: string): string {
  // Comments go first, by hand: a scene may mention a CSS variable (`--cell-tint`) in its header comment,
  // and `--` inside a comment is malformed XML, which SVGO's strict parser rejects (browsers do not).
  const bare = svg.replace(/<!--[\s\S]*?-->/g, '')
  const out = optimize(bare, { ...SVGO_CONFIG, path }).data
  // SVGO sometimes drops (or adds) the closing `Z` of a stroked outline, whose start point then gets a butt cap
  // instead of a round join (a notch a pixel wide), or the other way round. Paths keep their order, so put back the original
  // data of any path whose count of them changed.
  const original = [...bare.matchAll(PATH_DATA)].map((m) => m[2])
  let i = 0
  return out.replace(PATH_DATA, (whole, open, d, close) => {
    const before = original[i++]
    return before !== undefined && closings(d) !== closings(before) ? open + before + close : whole
  })
}

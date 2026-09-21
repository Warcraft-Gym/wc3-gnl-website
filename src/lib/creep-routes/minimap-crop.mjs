/** Crops the black letterbox bands a non-square map's minimap BLP is
 * padded with, so the resulting image's aspect matches the map's own
 * `bounds` aspect and `x`/`y` normalised coordinates (computed against
 * `bounds`, see `camps.mjs`) land on the right pixel with no further
 * adjustment.
 *
 * `war3mapMap.blp` is always rendered into a square canvas (256x256):
 * non-square maps get uniform black bands on the shorter axis (top/bottom
 * for a wide map, left/right for a tall one). This is a pure function so
 * it can be tested on small synthetic buffers without decoding a real BLP.
 */

const BAND_THRESHOLD = 8; // a pixel counts as "band" if every channel is <= this
const ASPECT_TOLERANCE = 0.03; // 3%

function isBandPixel(rgba, width, x, y) {
  const i = (y * width + x) * 4;
  return rgba[i] <= BAND_THRESHOLD && rgba[i + 1] <= BAND_THRESHOLD && rgba[i + 2] <= BAND_THRESHOLD;
}

function isBandRow(rgba, width, y) {
  for (let x = 0; x < width; x++) {
    if (!isBandPixel(rgba, width, x, y)) return false;
  }
  return true;
}

function isBandColumn(rgba, width, height, x) {
  for (let y = 0; y < height; y++) {
    if (!isBandPixel(rgba, width, x, y)) return false;
  }
  return true;
}

function countBand(count, isBand) {
  let n = 0;
  while (n < count && isBand(n)) n++;
  return n;
}

/** Crops uniform black padding bands from `rgba` (row-major RGBA,
 * `width`x`height`) and checks the result's aspect against `boundsAspect`
 * (`(xMax-xMin)/(yMax-yMin)`). Returns `{ data, width, height }` (a new,
 * possibly-smaller buffer). Throws if the cropped image's aspect does not
 * match `boundsAspect` within 3% — a mismatch means either real map content
 * looked like a band and got wrongly cropped, or a genuine letterbox was
 * missed, and shipping either would misalign every marker. */
export function cropLetterbox(rgba, width, height, boundsAspect) {
  const top = countBand(height, (y) => isBandRow(rgba, width, y));
  const bottom = countBand(height - top, (n) => isBandRow(rgba, width, height - 1 - n));
  const left = countBand(width, (x) => isBandColumn(rgba, width, height, x));
  const right = countBand(width - left, (n) => isBandColumn(rgba, width, height, width - 1 - n));

  const newWidth = width - left - right;
  const newHeight = height - top - bottom;

  const cropped = new Uint8Array(newWidth * newHeight * 4);
  for (let y = 0; y < newHeight; y++) {
    const srcStart = ((y + top) * width + left) * 4;
    const dstStart = y * newWidth * 4;
    cropped.set(rgba.subarray(srcStart, srcStart + newWidth * 4), dstStart);
  }

  const croppedAspect = newWidth / newHeight;
  const relativeError = Math.abs(croppedAspect - boundsAspect) / boundsAspect;
  if (relativeError > ASPECT_TOLERANCE) {
    throw new Error(
      `minimap aspect mismatch after letterbox crop: bounds aspect ${boundsAspect.toFixed(4)}, ` +
        `image aspect ${croppedAspect.toFixed(4)} (${newWidth}x${newHeight} from ${width}x${height})`,
    );
  }

  return { data: cropped, width: newWidth, height: newHeight };
}

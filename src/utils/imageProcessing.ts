// src/utils/imageProcessing.ts

/**
 * Load an image from a base64 string or URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // avoid CORS issues if needed
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}

/**
 * Generate all PBR maps: displacement, normal, roughness, specular
 * @param base64 Base64 string of the input image
 * @param strength Strength factor for the normal map
 * @returns Record with keys 'displacement', 'normal', 'roughness', 'specular'
 */
export async function generateMaps(
    base64: string,
    strength: number
): Promise<Record<string, string>> {
    const img = await loadImage(base64);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    const maps: Record<string, string> = {};

    // Displacement (grayscale)
    const displacement = createGrayscaleMap(imageData, 1.0);
    ctx.putImageData(displacement, 0, 0);
    maps["displacement"] = canvas.toDataURL("image/png");

    // Normal (fake RGB map)
    const normal = createNormalMap(imageData, strength);
    ctx.putImageData(normal, 0, 0);
    maps["normal"] = canvas.toDataURL("image/png");

    // Roughness (inverted grayscale)
    const roughness = createGrayscaleMap(imageData, -1.0);
    ctx.putImageData(roughness, 0, 0);
    maps["roughness"] = canvas.toDataURL("image/png");

    // Specular (lighter grayscale)
    const specular = createGrayscaleMap(imageData, 0.5);
    ctx.putImageData(specular, 0, 0);
    maps["specular"] = canvas.toDataURL("image/png");

    return maps;
}

/**
 * Create a grayscale ImageData map
 */
function createGrayscaleMap(imageData: ImageData, factor: number): ImageData {
    const d = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const out = new Uint8ClampedArray(d.length);

    for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
        const v = Math.min(255, Math.max(0, avg * Math.abs(factor)));
        // invert if factor < 0
        const value = factor >= 0 ? v : 255 - v;
        out[i] = out[i + 1] = out[i + 2] = value;
        out[i + 3] = 255;
    }

    return new ImageData(out, width, height);
}

/**
 * Create a fake normal map (simple RGB manipulation)
 */
function createNormalMap(imageData: ImageData, strength: number): ImageData {
    const { data, width, height } = imageData;
    const gray = new Float32Array(width * height);

    // Step 1: Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = (data[i] + data[i + 1] + data[i + 2]) / 3;
    }

    const out = new Uint8ClampedArray(data.length);

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;

            // Apply Sobel operator
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = x + kx;
                    const py = y + ky;
                    const idx = py * width + px;
                    const weightIndex = (ky + 1) * 3 + (kx + 1);
                    gx += gray[idx] * sobelX[weightIndex];
                    gy += gray[idx] * sobelY[weightIndex];
                }
            }

            gx *= strength / 255;
            gy *= strength / 255;

            // Compute normal vector (Z is "up")
            const nx = gx;
            const ny = gy;
            const nz = 1.0;

            // Normalize
            const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const nxN = nx / length;
            const nyN = ny / length;
            const nzN = nz / length;

            // Map [-1, 1] range to [0, 255]
            const r = (nxN * 0.5 + 0.5) * 255;
            const g = (nyN * 0.5 + 0.5) * 255;
            const b = (nzN * 0.5 + 0.5) * 255;

            const i = (y * width + x) * 4;
            out[i] = r;
            out[i + 1] = g;
            out[i + 2] = b;
            out[i + 3] = 255;
        }
    }

    return new ImageData(out, width, height);
}


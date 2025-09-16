import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";

//
// ─── Color Utilities ───────────────────────────────────────────────────────────
//

/** Convert RGB array to hex string (#RRGGBB) */
const rgbToHex = (rgb: number[]): string => {
    return (
        "#" +
        rgb
            .map((val) => {
                const hex = Math.round(val).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
    );
};

/** Get pixel data from image, downsampled for performance */
const getPixelData = (
    img: HTMLImageElement,
    sampleSize: number
): number[][] => {
    const canvas = document.createElement("canvas");

    // Resize large images for performance (max 400px width)
    const scale = Math.min(400 / img.width, 1);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const pixels: number[][] = [];
    for (let i = 0; i < data.length; i += 4 * sampleSize) {
        pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    return pixels;
};

/** K-Means clustering to extract k dominant colors */
const kMeans = (
    data: number[][],
    k: number,
    maxIterations = 20
): number[][] => {
    if (data.length === 0) return [];

    // Initialize centroids with k random points
    let centroids: number[][] = Array.from({ length: k }, () => {
        return data[Math.floor(Math.random() * data.length)];
    });

    for (let i = 0; i < maxIterations; i++) {
        const clusters: number[][][] = Array.from({ length: k }, () => []);

        // Assign points to nearest centroid
        data.forEach((point) => {
            let minDistance = Infinity;
            let closest = 0;
            centroids.forEach((centroid, index) => {
                const distance =
                    (point[0] - centroid[0]) ** 2 +
                    (point[1] - centroid[1]) ** 2 +
                    (point[2] - centroid[2]) ** 2;
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = index;
                }
            });
            clusters[closest].push(point);
        });

        const newCentroids = centroids.map((centroid, index) => {
            const cluster = clusters[index];
            if (cluster.length === 0) return centroid;
            const avg = cluster.reduce(
                (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
                [0, 0, 0]
            );
            return [avg[0] / cluster.length, avg[1] / cluster.length, avg[2] / cluster.length];
        });

        const converged = newCentroids.every((c, i) =>
            Math.sqrt(
                (c[0] - centroids[i][0]) ** 2 +
                (c[1] - centroids[i][1]) ** 2 +
                (c[2] - centroids[i][2]) ** 2
            ) < 1
        );
        centroids = newCentroids;
        if (converged) break;
    }

    return centroids;
};

const PaletteExtractor = () => {
    const [file, setFile] = useState<File | null>(null);
    const [palette, setPalette] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [numColors, setNumColors] = useState(5);
    const [sampleSize, setSampleSize] = useState(10);
    const [copiedColor, setCopiedColor] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPalette([]);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = objectUrl;

        setLoading(true);
        img.onload = () => {
            const pixels = getPixelData(img, sampleSize);
            const centroids = kMeans(pixels, numColors);
            setPalette(centroids.map(rgbToHex));
            setLoading(false);
        };

        return () => URL.revokeObjectURL(objectUrl);
    }, [file, numColors, sampleSize]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "image/*": [] },
        multiple: false,
    });

    const handleCopyClick = async (color: string) => {
        try {
            await navigator.clipboard.writeText(color);
            setCopiedColor(color);
            setTimeout(() => setCopiedColor(null), 1500);
        } catch (err) {
            console.error("Failed to copy color:", err);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6 min-h-screen bg-black text-white">
            <h2 className="text-2xl font-bold">Palette Extractor</h2>

            <div
                {...getRootProps()}
                className="w-full max-w-4xl h-64 border-4 border-dashed border-gray-400 rounded-lg flex items-center justify-center cursor-pointer p-4 text-center transition-colors hover:border-purple-500"
            >
                <input {...getInputProps()} />
                {file ? (
                    <img
                        src={URL.createObjectURL(file)}
                        alt="Uploaded"
                        className="object-contain max-h-full"
                    />
                ) : isDragActive ? (
                    <p>Drop the image here...</p>
                ) : (
                    <p>Drag & drop or click to upload an image</p>
                )}
            </div>

            <hr className="w-full my-6 border-gray-700" />

            <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl justify-center">
                <div className="flex-1 flex flex-col gap-4 p-6 bg-gray-900 border border-gray-700 rounded-lg">
                    <h3 className="text-xl font-semibold">Settings</h3>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="numColors" className="text-sm font-medium">
                            Number of Colors: {numColors}
                        </label>
                        <input
                            type="range"
                            id="numColors"
                            min={2}
                            max={10}
                            value={numColors}
                            onChange={(e) => setNumColors(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="sampleSize" className="text-sm font-medium">
                            Sampling Quality: {sampleSize} (lower = better quality, slower)
                        </label>
                        <input
                            type="range"
                            id="sampleSize"
                            min={2}
                            max={20}
                            value={sampleSize}
                            onChange={(e) => setSampleSize(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    {loading && (
                        <div className="flex items-center gap-2 text-gray-400 mt-4">
                            <svg
                                className="animate-spin h-5 w-5 text-purple-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 
                     0 5.373 0 12h4zm2 5.291A7.962 
                     7.962 0 014 12H0c0 3.042 1.135 
                     5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            <p>Extracting palette...</p>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col items-center p-6 bg-gray-900 border border-gray-700 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Extracted Palette</h3>
                    {palette.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
                            {palette.map((color, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col items-center gap-2 relative"
                                >
                                    <div
                                        className="w-20 h-20 rounded-lg border-2 border-gray-600 cursor-pointer transition-transform hover:scale-105"
                                        style={{ backgroundColor: color }}
                                        onClick={() => handleCopyClick(color)}
                                        aria-label={`Copy ${color}`}
                                    />
                                    <span className="text-sm font-mono text-gray-300">
                                        {color.toUpperCase()}
                                    </span>
                                    {copiedColor === color && (
                                        <span className="absolute -bottom-6 text-xs text-green-400">
                                            Copied!
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No palette extracted yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaletteExtractor;

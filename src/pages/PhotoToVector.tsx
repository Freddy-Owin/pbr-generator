import * as ImageTracer from "imagetracerjs";
import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

interface ImageTracerOptions {
    numberofcolors?: number;
    ltres?: number;
    qtres?: number;
    strokewidth?: number;
    viewbox?: boolean;
    pal?: { r: number; g: number; b: number; a: number }[];
    colorsampling?: number;
    scale?: number;
    pathomit?: number;
}

const PRESET_CONFIGS: { [key: string]: ImageTracerOptions } = {
    ultra_detail_color: {
        numberofcolors: 64,
        ltres: 0.0005,
        qtres: 0.0005,
        strokewidth: 0,
        viewbox: true,
        scale: 4,
        pathomit: 0.05,
    },
    ultra_detail_bw: {
        pal: [
            { r: 0, g: 0, b: 0, a: 255 },
            { r: 255, g: 255, b: 255, a: 255 },
        ],
        numberofcolors: 2,
        ltres: 0.0001,
        qtres: 0.0001,
        strokewidth: 1,
        viewbox: true,
        scale: 4,
        pathomit: 0.01,
    },
    lineart: {
        pal: [
            { r: 0, g: 0, b: 0, a: 255 },
            { r: 255, g: 255, b: 255, a: 255 },
        ],
        numberofcolors: 2,
        ltres: 0.05,
        qtres: 0.05,
        strokewidth: 2,
        viewbox: true,
        scale: 4,
        pathomit: 0.01,
    },
    sketch: {
        pal: [
            { r: 0, g: 0, b: 0, a: 255 },
            { r: 255, g: 255, b: 255, a: 255 },
        ],
        numberofcolors: 2,
        ltres: 0.05,
        qtres: 0.05,
        strokewidth: 1.5,
        viewbox: true,
        scale: 4,
        pathomit: 0.01,
    },
    default: {
        numberofcolors: 32,
        ltres: 0.5,
        qtres: 0.5,
        strokewidth: 0,
        viewbox: true,
        scale: 2,
        pathomit: 2,
    },
};

const PRESET_LABELS: { [key: string]: string } = {
    ultra_detail_color: "Ultra Detail Color",
    ultra_detail_bw: "Ultra Detail BW",
    lineart: "Line Art",
    sketch: "Sketch",
    default: "Default",
};

const PhotoToVector: React.FC = () => {
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [vectorSvg, setVectorSvg] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [preset, setPreset] = useState<string>("default");
    const [superResolution, setSuperResolution] = useState<boolean>(false);

    const convertToGrayscale = (data: ImageData): ImageData => {
        const newData = new ImageData(data.width, data.height);
        for (let i = 0; i < data.data.length; i += 4) {
            const avg = Math.round(
                (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3
            );
            newData.data[i] = avg;
            newData.data[i + 1] = avg;
            newData.data[i + 2] = avg;
            newData.data[i + 3] = data.data[i + 3];
        }
        return newData;
    };

    const applyEdgeDetection = (data: ImageData): ImageData => {
        const width = data.width;
        const height = data.height;
        const gray = new Float32Array(width * height);

        for (let i = 0; i < width * height; i++) {
            const offset = i * 4;
            gray[i] =
                0.299 * data.data[offset] +
                0.587 * data.data[offset + 1] +
                0.114 * data.data[offset + 2];
        }

        const output = new ImageData(width, height);

        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0,
                    gy = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = gray[(y + ky) * width + (x + kx)];
                        const idx = (ky + 1) * 3 + (kx + 1);
                        gx += pixel * sobelX[idx];
                        gy += pixel * sobelY[idx];
                    }
                }
                const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
                const idx = (y * width + x) * 4;
                output.data[idx] = mag;
                output.data[idx + 1] = mag;
                output.data[idx + 2] = mag;
                output.data[idx + 3] = 255;
            }
        }
        return output;
    };

    useEffect(() => {
        if (!imageData) return;
        setIsProcessing(true);

        setTimeout(() => {
            try {
                let processedData = imageData;

                if (preset === "lineart" || preset === "sketch") {
                    processedData = convertToGrayscale(imageData);
                    processedData = applyEdgeDetection(processedData);
                } else if (preset.includes("bw")) {
                    processedData = convertToGrayscale(imageData);
                }

                const options = PRESET_CONFIGS[preset];
                let svgString = ImageTracer.imagedataToSVG(processedData, options);

                if (preset === "lineart" || preset === "sketch") {
                    svgString = svgString.replace(/fill="[^"]*"/g, 'fill="none"');
                    svgString = svgString.replace(/stroke="[^"]*"/g, 'stroke="black"');
                }

                setVectorSvg(svgString);
            } catch (err) {
                console.error("Vectorization error:", err);
                setVectorSvg(null);
            }
            setIsProcessing(false);
        }, 50);
    }, [imageData, preset, superResolution]);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;
            const file = acceptedFiles[0];
            setOriginalUrl(URL.createObjectURL(file));
            setVectorSvg(null);
            setPreset("default");

            const reader = new FileReader();
            reader.onload = (e) => {
                if (!e.target?.result) return;
                const img = new Image();
                img.onload = () => setImageData(getImageData(img, superResolution));
                img.src = e.target.result as string;
            };
            reader.readAsDataURL(file);
        },
        [superResolution]
    );

    const getImageData = (img: HTMLImageElement, superRes: boolean): ImageData => {
        const MAX_DIM = superRes ? 4096 : 2048;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
            w = Math.floor(w * ratio);
            h = Math.floor(h * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Cannot get canvas context");
        ctx.drawImage(img, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h);
    };

    const downloadSVG = () => {
        if (!vectorSvg) return;
        const blob = new Blob([vectorSvg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `vectorized_${preset}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadPNG = () => {
        if (!vectorSvg) return;
        const img = new Image();
        const svgBlob = new Blob([vectorSvg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width || 2048;
            canvas.height = img.height || 2048;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (!blob) return;
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `vectorized_${preset}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, "image/png");
        };

        img.src = url;
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "image/jpeg": [], "image/png": [] },
        multiple: false,
    });

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
            <h1 className="text-2xl font-bold mb-6">📷 Photo-to-Vector Mapper</h1>

            <div
                {...getRootProps()}
                className={`w-full max-w-4xl h-96 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition ${isDragActive ? "border-blue-400 bg-gray-900" : "border-gray-600 bg-gray-800"
                    }`}
            >
                <input {...getInputProps()} />
                {originalUrl ? (
                    <img src={originalUrl} alt="Original" className="max-h-full object-contain rounded-lg" />
                ) : (
                    <p className="text-gray-400">Drag & drop an image here, or click to select</p>
                )}
            </div>

            {originalUrl && (
                <div className="mt-6 w-full max-w-4xl p-4 bg-gray-900 rounded-xl flex flex-col items-center">
                    <h3 className="text-md font-semibold text-center mb-3">Vectorization Options</h3>
                    <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={superResolution}
                                onChange={(e) => setSuperResolution(e.target.checked)}
                            />
                            Super-Resolution (up to 4096px)
                        </label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                        {Object.keys(PRESET_LABELS).map((key) => (
                            <label
                                key={key}
                                className="flex items-center justify-center p-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition"
                            >
                                <input
                                    type="radio"
                                    name="preset"
                                    value={key}
                                    checked={preset === key}
                                    onChange={(e) => setPreset(e.target.value)}
                                    className="mr-2"
                                />
                                {PRESET_LABELS[key]}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {originalUrl && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                    <div className="bg-gray-900 p-4 rounded-xl flex flex-col items-center">
                        <h2 className="text-lg font-semibold mb-2">Original</h2>
                        <img src={originalUrl} alt="Original" className="max-h-96 object-contain rounded-lg" />
                    </div>
                    <div className="bg-gray-900 p-4 rounded-xl flex flex-col items-center">
                        <h2 className="text-lg font-semibold mb-2">Vectorized</h2>
                        {(isProcessing || !vectorSvg) ? (
                            <div className="h-96 w-full flex items-center justify-center">
                                <p className="animate-pulse">{isProcessing ? "Processing..." : " "}</p>
                            </div>
                        ) : (
                            <>
                                <div className="max-h-96 w-full bg-white overflow-auto" dangerouslySetInnerHTML={{ __html: vectorSvg }} />
                                <div className="flex gap-4 mt-4">
                                    <button
                                        onClick={downloadSVG}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold transition"
                                    >
                                        Download SVG
                                    </button>
                                    <button
                                        onClick={downloadPNG}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold transition"
                                    >
                                        Download PNG
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoToVector;

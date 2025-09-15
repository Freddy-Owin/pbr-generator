import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type MapType = "Normal" | "Displacement" | "Roughness" | "Specular";

const MAP_NAMES: MapType[] = ["Normal", "Displacement", "Roughness", "Specular"];

type NumericAdjustment = Record<string, number>;
type BoolAdjustment = Record<string, boolean>;

type MapAdjustments = {
    numeric: NumericAdjustment;
    boolean: BoolAdjustment;
};

const DEFAULT_ADJUSTMENTS: Record<MapType, MapAdjustments> = {
    Normal: { numeric: { strength: 1.0, level: 1.0, blur: 0 }, boolean: { invert: false } },
    Displacement: { numeric: { contrast: 1.0, blur: 0 }, boolean: { invert: false } },
    Roughness: { numeric: { contrast: 1.0, blur: 0 }, boolean: { invert: true } },
    Specular: { numeric: { contrast: 1.0, blur: 0 }, boolean: { invert: false } },
};


const createGrayscale = (img: HTMLImageElement, adjustments?: MapAdjustments) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
    }

    if (adjustments) {
        if (adjustments.boolean.invert) {
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
        }
        if (adjustments.numeric.contrast) {
            const contrast = adjustments.numeric.contrast;
            const factor = 259 * (contrast + 255) / (255 * (259 - contrast));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

const createNormalMap = (grayscale: HTMLCanvasElement, strength: number = 2) => {
    const width = grayscale.width;
    const height = grayscale.height;

    const ctx = grayscale.getContext("2d")!;
    const src = ctx.getImageData(0, 0, width, height);
    const dstCanvas = document.createElement("canvas");
    dstCanvas.width = width;
    dstCanvas.height = height;
    const dstCtx = dstCanvas.getContext("2d")!;
    const dst = dstCtx.createImageData(width, height);

    const sobelX = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1],
    ];
    const sobelY = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1],
    ];

    const getPixel = (x: number, y: number) => {
        x = Math.max(0, Math.min(x, width - 1));
        y = Math.max(0, Math.min(y, height - 1));
        return src.data[(y * width + x) * 4];
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let gx = 0, gy = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const val = getPixel(x + kx, y + ky);
                    gx += val * sobelX[ky + 1][kx + 1];
                    gy += val * sobelY[ky + 1][kx + 1];
                }
            }

            const dz = 255 / strength;
            const length = Math.sqrt(gx * gx + gy * gy + dz * dz);
            const nx = (gx / length) * 0.5 + 0.5;
            const ny = (gy / length) * 0.5 + 0.5;
            const nz = (dz / length) * 0.5 + 0.5;

            const i = (y * width + x) * 4;
            dst.data[i] = nx * 255;
            dst.data[i + 1] = ny * 255;
            dst.data[i + 2] = nz * 255;
            dst.data[i + 3] = 255;
        }
    }

    dstCtx.putImageData(dst, 0, 0);
    return dstCanvas;
};

const PbrGeneratorPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [maps, setMaps] = useState<Record<MapType, string>>({
        Normal: "",
        Displacement: "",
        Roughness: "",
        Specular: "",
    });
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [adjustments, setAdjustments] = useState<Record<MapType, MapAdjustments>>(DEFAULT_ADJUSTMENTS);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (files) => setFile(files[0]),
        accept: { "image/*": [] },
        multiple: false,
    });

    useEffect(() => {
        if (!file) return;
        const generateMaps = async () => {
            setLoading(true);
            setProgress(0);

            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise((res) => (img.onload = res));

            const baseGray = createGrayscale(img);

            const newMaps: Record<MapType, string> = {
                Normal: createNormalMap(baseGray, adjustments.Normal.numeric.strength).toDataURL("image/png"),
                Displacement: createGrayscale(img, adjustments.Displacement).toDataURL("image/png"),
                Roughness: createGrayscale(img, adjustments.Roughness).toDataURL("image/png"),
                Specular: createGrayscale(img, adjustments.Specular).toDataURL("image/png"),
            };

            setMaps(newMaps);
            setProgress(100);
            setLoading(false);
        };
        generateMaps();
    }, [file, adjustments]);

    const handleAdjustmentChange = (map: MapType, key: string, value: number | boolean, isBool: boolean) => {
        setAdjustments((prev) => ({
            ...prev,
            [map]: {
                numeric: isBool ? prev[map].numeric : { ...prev[map].numeric, [key]: value as number },
                boolean: !isBool ? prev[map].boolean : { ...prev[map].boolean, [key]: value as boolean },
            },
        }));
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        MAP_NAMES.forEach((map) => {
            const data = maps[map];
            if (data) {
                const bstr = atob(data.split(",")[1]);
                const buffer = new Uint8Array(bstr.length);
                for (let i = 0; i < bstr.length; i++) buffer[i] = bstr.charCodeAt(i);
                zip.file(`${map}.png`, buffer);
            }
        });
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "pbr_maps.zip");
    };

    return (
        <div className="flex my-5 flex-col lg:flex-row gap-6 p-6 min-h-[calc(100vh-100px)]">
            <div className="flex flex-col gap-6 flex-1">
                <div
                    {...getRootProps()}
                    className="w-full h-72 border-4 border-dashed border-gray-400 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-600"
                >
                    <input {...getInputProps()} />
                    {file ? <img src={URL.createObjectURL(file)} alt="Uploaded" className="object-contain w-full h-full p-2" /> :
                        isDragActive ? <p>Drop the image here...</p> : <p>Drag & drop or click to upload</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {MAP_NAMES.map((map) => (
                        <div key={map} className="w-full h-72 border-2 border-gray-400 rounded-lg flex flex-col items-center justify-center">
                            {maps[map] ? <img src={maps[map]} alt={map} className="object-contain w-full h-full" /> : <p>{map} will appear here</p>}
                            <span className="mt-1 font-semibold text-white">{map}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="flex flex-col gap-4 w-72">
                {MAP_NAMES.map((map) => (
                    <div key={map} className="border p-4 rounded-lg bg-gray-800 text-white">
                        <h3 className="mb-2 font-semibold">{map} Adjustments</h3>

                        {Object.entries(adjustments[map].numeric).map(([key, value]) => {
                            let min = 0, max = 10, step = 0.1;
                            if (key.toLowerCase().includes("strength")) max = 10;
                            if (key.toLowerCase().includes("contrast")) max = 10;
                            if (key.toLowerCase().includes("level")) max = 10;
                            if (key.toLowerCase().includes("blur")) max = 10;

                            return (
                                <div key={key} className="flex flex-col mb-4">
                                    <span className="mb-1">{key}: {value.toFixed(2)}</span>
                                    <input
                                        type="range"
                                        min={min}
                                        max={max}
                                        step={step}
                                        value={value}
                                        onChange={(e) =>
                                            handleAdjustmentChange(map, key, parseFloat(e.target.value), false)
                                        }
                                        className="w-full"
                                    />
                                </div>
                            );
                        })}

                        {Object.entries(adjustments[map].boolean).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) =>
                                        handleAdjustmentChange(map, key, e.target.checked, true)
                                    }
                                />
                                <span>{key}</span>
                            </div>
                        ))}
                    </div>
                ))}

                {maps.Normal && (
                    <button
                        onClick={handleDownloadAll}
                        className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors mt-4"
                    >
                        Download All
                    </button>
                )}

                {loading && (
                    <div className="w-56 mt-4">
                        <p className="text-white mb-2">{Math.floor(progress)}%</p>
                        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-3 bg-purple-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PbrGeneratorPage;

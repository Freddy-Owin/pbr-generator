import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const MAP_NAMES_OBJ = {
    Normal: "Normal",
    Displacement: "Displacement",
    Roughness: "Roughness",
    Specular: "Specular",
} as const;

type MapName = typeof MAP_NAMES_OBJ[keyof typeof MAP_NAMES_OBJ];

const MAP_NAMES = Object.values(MAP_NAMES_OBJ);

const createGrayscale = (img: HTMLImageElement, invert: boolean = false): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("2D context not available");

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const val = invert ? 255 - avg : avg;
        data[i] = data[i + 1] = data[i + 2] = val;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

const createNormalMap = (grayscale: HTMLCanvasElement, strength: number): HTMLCanvasElement => {
    const width = grayscale.width;
    const height = grayscale.height;

    const ctx = grayscale.getContext("2d");
    if (!ctx) throw new Error("2D context not available");

    const src = ctx.getImageData(0, 0, width, height);
    const dstCanvas = document.createElement("canvas");
    dstCanvas.width = width;
    dstCanvas.height = height;
    const dstCtx = dstCanvas.getContext("2d");
    if (!dstCtx) throw new Error("2D context not available");

    const dst = dstCtx.createImageData(width, height);

    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    const getPixel = (x: number, y: number): number => {
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

const applyLevels = (canvas: HTMLCanvasElement, level: number): HTMLCanvasElement => {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const min = level * 255;
    const max = 255 - level * 255;

    for (let i = 0; i < data.length; i += 4) {
        const value = data[i];
        const newValue = Math.min(255, Math.max(0, (value - min) * (255 / (max - min))));
        data[i] = data[i + 1] = data[i + 2] = newValue;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

const applyContrast = (canvas: HTMLCanvasElement, contrast: number): HTMLCanvasElement => {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < data.length; i += 4) {
        const newValue = factor * (data[i] - 128) + 128;
        data[i] = data[i + 1] = data[i + 2] = newValue;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

const applyMeanRange = (canvas: HTMLCanvasElement, mean: number, range: number): HTMLCanvasElement => {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const minVal = mean - range / 2;
    const maxVal = mean + range / 2;
    for (let i = 0; i < data.length; i += 4) {
        const value = data[i] / 255;
        const newValue = (value - minVal) / (maxVal - minVal);
        data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, newValue * 255));
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

const applyBlurSharp = (canvas: HTMLCanvasElement, blurSharp: number): HTMLCanvasElement => {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");

    if (Math.abs(blurSharp) < 0.1) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const pixels = [...data];
    const width = canvas.width;
    const height = canvas.height;

    let kernel: number[];
    let kernelWeight = 0;

    if (blurSharp > 0) {
        const size = Math.round(blurSharp);
        kernel = Array(size * size).fill(1);
    } else {
        const size = Math.abs(Math.round(blurSharp));
        kernel = Array(size * size).fill(-1);
        const center = Math.floor(size * size / 2);
        kernel[center] = size * size;
    }
    kernelWeight = kernel.reduce((a, b) => a + b, 0) || 1;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sumR = 0, sumG = 0, sumB = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const kernelVal = kernel[(ky + 1) * 3 + (kx + 1)];
                    sumR += pixels[idx * 4] * kernelVal;
                    sumG += pixels[idx * 4 + 1] * kernelVal;
                    sumB += pixels[idx * 4 + 2] * kernelVal;
                }
            }
            const i = (y * width + x) * 4;
            data[i] = Math.min(255, Math.max(0, sumR / kernelWeight));
            data[i + 1] = Math.min(255, Math.max(0, sumG / kernelWeight));
            data[i + 2] = Math.min(255, Math.max(0, sumB / kernelWeight));
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

interface PbrMaps {
    [key: string]: string;
}

const PbrGeneratorPage = () => {
    const [file, setFile] = useState<File | null>(null);
    const [maps, setMaps] = useState<PbrMaps>({
        Normal: "",
        Displacement: "",
        Roughness: "",
        Specular: "",
    });
    const [selectedMap, setSelectedMap] = useState<MapName>(MAP_NAMES_OBJ.Normal);
    const mountRef = useRef<HTMLDivElement>(null);
    const [settings, setSettings] = useState({
        normal: { strength: 2, level: 0, blurSharp: 0, contrast: 0 },
        displacement: { contrast: 0, blurSharp: 0 },
        roughness: { strength: 1, mean: 0.5, range: 1, blurSharp: 0 },
        specular: { strength: 1, mean: 0.5, range: 1 },
    });

    const handleSliderChange = (mapName: keyof typeof settings, setting: string, value: number) => {
        setSettings(prevSettings => ({
            ...prevSettings,
            [mapName]: {
                ...prevSettings[mapName],
                [setting]: value,
            },
        }));
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles: File[]) => setFile(acceptedFiles[0]),
        accept: { "image/*": [] },
        multiple: false,
    });

    useEffect(() => {
        if (!file) {
            setMaps({ Normal: "", Displacement: "", Roughness: "", Specular: "" });
            return;
        }

        const generateMaps = async () => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise<void>((res) => (img.onload = () => res()));

            const normalGrayscale = createGrayscale(img);
            applyContrast(normalGrayscale, settings.normal.contrast);
            applyLevels(normalGrayscale, settings.normal.level);
            applyBlurSharp(normalGrayscale, settings.normal.blurSharp);
            const normalCanvas = createNormalMap(normalGrayscale, settings.normal.strength);

            const displacementCanvas = createGrayscale(img);
            applyContrast(displacementCanvas, settings.displacement.contrast);
            applyBlurSharp(displacementCanvas, settings.displacement.blurSharp);

            const roughnessCanvas = createGrayscale(img, true);
            applyMeanRange(roughnessCanvas, settings.roughness.mean, settings.roughness.range);
            applyBlurSharp(roughnessCanvas, settings.roughness.blurSharp);

            const specularCanvas = createGrayscale(img);
            applyMeanRange(specularCanvas, settings.specular.mean, settings.specular.range);

            const newMaps: PbrMaps = {
                Normal: normalCanvas.toDataURL("image/png"),
                Displacement: displacementCanvas.toDataURL("image/png"),
                Roughness: roughnessCanvas.toDataURL("image/png"),
                Specular: specularCanvas.toDataURL("image/png"),
            };

            setMaps(newMaps);
        };
        generateMaps();
    }, [file, settings]);

    useEffect(() => {
        if (!maps[selectedMap] || !mountRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.z = 3;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(400, 400);
        mountRef.current.innerHTML = "";
        mountRef.current.appendChild(renderer.domElement);

        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5, 100, 100, 100);
        const textureLoader = new THREE.TextureLoader();

        let previewMap: THREE.Texture | undefined;
        let normalMap: THREE.Texture | undefined;
        let displacementMap: THREE.Texture | undefined;
        let roughnessMap: THREE.Texture | undefined;
        let metalnessMap: THREE.Texture | undefined;

        if (selectedMap === MAP_NAMES_OBJ.Normal) {
            previewMap = textureLoader.load(maps.Normal);
            normalMap = textureLoader.load(maps.Normal);
        } else if (selectedMap === MAP_NAMES_OBJ.Displacement) {
            previewMap = textureLoader.load(maps.Displacement);
            displacementMap = textureLoader.load(maps.Displacement);
        } else if (selectedMap === MAP_NAMES_OBJ.Roughness) {
            previewMap = textureLoader.load(maps.Roughness);
            roughnessMap = textureLoader.load(maps.Roughness);
        } else if (selectedMap === MAP_NAMES_OBJ.Specular) {
            previewMap = textureLoader.load(maps.Specular);
            metalnessMap = textureLoader.load(maps.Specular);
        }

        const material = new THREE.MeshStandardMaterial({
            map: previewMap,
            normalMap: normalMap,
            displacementMap: displacementMap,
            roughnessMap: roughnessMap,
            metalnessMap: metalnessMap,
            displacementScale: settings.displacement.contrast,
        });

        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(5, 5, 5).normalize();
        scene.add(directionalLight);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const animate = () => {
            requestAnimationFrame(animate);
            cube.rotation.y += 0.002;
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            previewMap?.dispose();
            normalMap?.dispose();
            roughnessMap?.dispose();
            displacementMap?.dispose();
            metalnessMap?.dispose();
            controls.dispose();
            ambientLight.dispose();
            directionalLight.dispose();
        };
    }, [maps, selectedMap, file, settings]);

    const handleDownloadAll = async () => {
        const b64toBlob = (b64Data: string): Uint8Array => {
            const byteString = atob(b64Data);
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < byteString.length; i++) {
                uint8Array[i] = byteString.charCodeAt(i);
            }
            return uint8Array;
        };

        const zip = new JSZip();
        MAP_NAMES.forEach((map) => {
            const data = maps[map];
            if (data) {
                const base64Data = data.split(",")[1];
                const buffer = b64toBlob(base64Data);
                zip.file(`${map}.png`, buffer);
            }
        });

        if (file) {
            zip.file(`BaseColor.${file.name.split('.').pop()}`, file);
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "pbr_maps.zip");
    };

    const renderControls = () => {
        if (selectedMap === MAP_NAMES_OBJ.Normal) {
            return (
                <>
                    <label className="text-sm font-medium">Strength: {settings.normal.strength.toFixed(1)}</label>
                    <input type="range" min={0.1} max={10} step={0.1} value={settings.normal.strength} onChange={(e) => handleSliderChange("normal", "strength", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Contrast: {settings.normal.contrast.toFixed(1)}</label>
                    <input type="range" min={-100} max={100} step={1} value={settings.normal.contrast} onChange={(e) => handleSliderChange("normal", "contrast", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Level: {settings.normal.level.toFixed(2)}</label>
                    <input type="range" min={0} max={1} step={0.01} value={settings.normal.level} onChange={(e) => handleSliderChange("normal", "level", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Blur/Sharp: {settings.normal.blurSharp.toFixed(1)}</label>
                    <input type="range" min={-2} max={2} step={0.1} value={settings.normal.blurSharp} onChange={(e) => handleSliderChange("normal", "blurSharp", parseFloat(e.target.value))} />
                </>
            );
        } else if (selectedMap === MAP_NAMES_OBJ.Displacement) {
            return (
                <>
                    <label className="text-sm font-medium">Contrast: {settings.displacement.contrast.toFixed(1)}</label>
                    <input type="range" min={-1} max={2} step={0.1} value={settings.displacement.contrast} onChange={(e) => handleSliderChange("displacement", "contrast", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Blur/Sharp: {settings.displacement.blurSharp.toFixed(1)}</label>
                    <input type="range" min={-2} max={2} step={0.1} value={settings.displacement.blurSharp} onChange={(e) => handleSliderChange("displacement", "blurSharp", parseFloat(e.target.value))} />
                </>
            );
        } else if (selectedMap === MAP_NAMES_OBJ.Roughness) {
            return (
                <>
                    <label className="text-sm font-medium">Strength: {settings.roughness.strength.toFixed(1)}</label>
                    <input type="range" min={0.1} max={10} step={0.1} value={settings.roughness.strength} onChange={(e) => handleSliderChange("roughness", "strength", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Mean: {settings.roughness.mean.toFixed(2)}</label>
                    <input type="range" min={0} max={1} step={0.01} value={settings.roughness.mean} onChange={(e) => handleSliderChange("roughness", "mean", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Range: {settings.roughness.range.toFixed(2)}</label>
                    <input type="range" min={0} max={1} step={0.01} value={settings.roughness.range} onChange={(e) => handleSliderChange("roughness", "range", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Blur/Sharp: {settings.roughness.blurSharp.toFixed(1)}</label>
                    <input type="range" min={-2} max={2} step={0.1} value={settings.roughness.blurSharp} onChange={(e) => handleSliderChange("roughness", "blurSharp", parseFloat(e.target.value))} />
                </>
            );
        } else if (selectedMap === MAP_NAMES_OBJ.Specular) {
            return (
                <>
                    <label className="text-sm font-medium">Strength: {settings.specular.strength.toFixed(1)}</label>
                    <input type="range" min={0.1} max={10} step={0.1} value={settings.specular.strength} onChange={(e) => handleSliderChange("specular", "strength", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Mean: {settings.specular.mean.toFixed(2)}</label>
                    <input type="range" min={0} max={1} step={0.01} value={settings.specular.mean} onChange={(e) => handleSliderChange("specular", "mean", parseFloat(e.target.value))} />
                    <label className="text-sm font-medium">Range: {settings.specular.range.toFixed(2)}</label>
                    <input type="range" min={0} max={1} step={0.01} value={settings.specular.range} onChange={(e) => handleSliderChange("specular", "range", parseFloat(e.target.value))} />
                </>
            );
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6 min-h-screen bg-[#000000] text-white">
            <h2 className="text-2xl font-bold">PBR Texture Generator</h2>

            <div {...getRootProps()} className="w-full max-w-4xl h-64 border-4 border-dashed border-gray-400 rounded-lg flex items-center justify-center cursor-pointer p-4 text-center">
                <input {...getInputProps()} />
                {file ? (
                    <img src={URL.createObjectURL(file)} alt="Uploaded" className="object-contain w-full h-full" />
                ) : isDragActive ? (
                    <p>Drop the image here...</p>
                ) : (
                    <p>Drag & drop or click to upload Original Image</p>
                )}
            </div>

            <hr className="w-full my-6 border-gray-700" />

            <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl justify-center">
                <div className="flex-1 flex flex-col gap-4 p-6 bg-gray-900 border border-gray-700 rounded-lg">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                        <h3 className="text-xl font-semibold">Control</h3>
                        <button
                            onClick={handleDownloadAll}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={!file || Object.values(maps).some(url => url === "")}
                        >
                            Download
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full">
                        {MAP_NAMES.map((map) => (
                            <button
                                key={map}
                                className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${selectedMap === map ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                                onClick={() => setSelectedMap(map as MapName)}
                                disabled={!maps[map]}
                            >
                                {map}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-4 mt-4">
                        {renderControls()}
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-900 border border-gray-700 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">3D Preview</h3>
                    <div ref={mountRef} className="w-full h-96 border border-gray-700 rounded-lg overflow-hidden flex items-center justify-center bg-gray-800" />
                </div>
            </div>

            <hr className="w-full my-6 border-gray-700" />

            <div className="w-full max-w-6xl">
                <h2 className="text-2xl font-bold mb-4 text-center">Generated Images</h2>
                <div className="flex flex-wrap gap-4 justify-center">
                    {MAP_NAMES.map((map) => (
                        <div key={map} className="flex flex-col items-center gap-2">
                            <img
                                src={maps[map] || ""}
                                alt={`${map} Map Preview`}
                                className="w-32 h-32 object-cover rounded-lg border-2 border-gray-700"
                                style={{
                                    borderColor: selectedMap === map ? '#34d399' : ''
                                }}
                            />
                            <span className="text-xs text-gray-400">{map}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PbrGeneratorPage;
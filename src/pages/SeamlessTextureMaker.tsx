import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";

const SeamlessTextureMaker: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [seamlessSrc, setSeamlessSrc] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(1);
    const [blendStrength, setBlendStrength] = useState<number>(15); // adjustable
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImageSrc(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    }, [file]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { "image/*": [] },
        onDrop: (acceptedFiles) => setFile(acceptedFiles[0]),
        multiple: false,
    });

    const generateSeamless = () => {
        if (!imageSrc || !canvasRef.current) return;

        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext("2d")!;
            const { width, height } = img;

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0);

            const offsetX = Math.floor(width / 2);
            const offsetY = Math.floor(height / 2);

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCanvas.getContext("2d")!.drawImage(canvas, 0, 0);

            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(tempCanvas, offsetX, 0, width - offsetX, height, 0, 0, width - offsetX, height);
            ctx.drawImage(tempCanvas, 0, 0, offsetX, height, width - offsetX, 0, offsetX, height);

            const verticalCanvas = document.createElement("canvas");
            verticalCanvas.width = width;
            verticalCanvas.height = height;
            verticalCanvas.getContext("2d")!.drawImage(canvas, 0, 0);

            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(verticalCanvas, 0, offsetY, width, height - offsetY, 0, 0, width, height - offsetY);
            ctx.drawImage(verticalCanvas, 0, 0, width, offsetY, 0, height - offsetY, width, offsetY);

            const blend = Math.floor(Math.min(width, height) * (blendStrength / 100));
            const imageData = ctx.getImageData(0, 0, width, height);
            const smoothstep = (t: number) => t * t * (3 - 2 * t);

            for (let y = 0; y < blend; y++) {
                const alpha = smoothstep(y / blend);
                for (let x = 0; x < width; x++) {
                    const topIdx = (y * width + x) * 4;
                    const bottomIdx = ((height - 1 - y) * width + x) * 4;
                    for (let i = 0; i < 3; i++) {
                        const avg = (imageData.data[topIdx + i] * (1 - alpha) + imageData.data[bottomIdx + i] * alpha) | 0;
                        imageData.data[topIdx + i] = avg;
                        imageData.data[bottomIdx + i] = avg;
                    }
                }
            }

            for (let x = 0; x < blend; x++) {
                const alpha = smoothstep(x / blend);
                for (let y = 0; y < height; y++) {
                    const leftIdx = (y * width + x) * 4;
                    const rightIdx = (y * width + (width - 1 - x)) * 4;
                    for (let i = 0; i < 3; i++) {
                        const avg = (imageData.data[leftIdx + i] * (1 - alpha) + imageData.data[rightIdx + i] * alpha) | 0;
                        imageData.data[leftIdx + i] = avg;
                        imageData.data[rightIdx + i] = avg;
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            setSeamlessSrc(canvas.toDataURL("image/png"));
        };
    };

    useEffect(() => {
        if (imageSrc) generateSeamless();
    }, [imageSrc, blendStrength]);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((prev) => Math.min(Math.max(prev + delta, 0.2), 5));
    };

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const link = document.createElement("a");
        link.href = canvasRef.current.toDataURL("image/png");
        link.download = "seamless-texture.png";
        link.click();
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-center mb-6">Seamless Texture Maker</h1>

            <div className="flex flex-col lg:flex-row gap-6">
                <div
                    {...getRootProps()}
                    className="flex-1 w-full h-64 border-4 border-dashed border-gray-400 rounded-lg flex items-center justify-center cursor-pointer p-4 text-center relative"
                >
                    <input {...getInputProps()} />
                    {file ? (
                        <img
                            src={URL.createObjectURL(file)}
                            alt="Uploaded"
                            className="object-contain w-full h-full pointer-events-none"
                        />
                    ) : isDragActive ? (
                        <p>Drop the image here...</p>
                    ) : (
                        <p>Drag & drop or click to upload Original Image</p>
                    )}
                </div>

                <div className="flex-1 border border-gray-300 p-4 rounded flex flex-col items-center">
                    {seamlessSrc ? (
                        <>
                            <p className="font-semibold mb-2">Seamless Texture Preview (Scroll to Zoom)</p>
                            <div className="flex items-center gap-2 mb-2 w-full">
                                <label className="text-sm font-medium">Blend Strength:</label>
                                <input
                                    type="range"
                                    min={0}
                                    max={50}
                                    value={blendStrength}
                                    onChange={(e) => setBlendStrength(Number(e.target.value))}
                                    className="flex-1"
                                />
                                <span className="w-12 text-right">{blendStrength}%</span>
                            </div>

                            <div
                                className="w-full h-64 overflow-auto border border-gray-200"
                                style={{
                                    backgroundImage: `url(${seamlessSrc})`,
                                    backgroundRepeat: "repeat",
                                    backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
                                    cursor: "zoom-in",
                                }}
                                onWheel={handleWheel}
                            />

                            <button
                                onClick={handleDownload}
                                className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                Download PNG
                            </button>
                        </>
                    ) : (
                        <p className="text-gray-500">Seamless preview will appear here.</p>
                    )}
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default SeamlessTextureMaker;

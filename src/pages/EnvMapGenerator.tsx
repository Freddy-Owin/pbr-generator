import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ViewerModalProps {
    src: string;
    onClose: () => void;
}

const ViewerModal: React.FC<ViewerModalProps> = ({ src, onClose }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            container.offsetWidth / container.offsetHeight,
            0.1,
            1000
        );
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        container.appendChild(renderer.domElement);

        const geometry = new THREE.SphereGeometry(50, 60, 40);
        geometry.scale(-1, 1, 1);
        const texture = new THREE.TextureLoader().load(src);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.rotateSpeed = -0.25;
        camera.position.set(0, 0, 0.1);

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            camera.aspect = container.offsetWidth / container.offsetHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, container.offsetHeight);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            container.removeChild(renderer.domElement);
        };
    }, [src]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
            <div className="relative w-full h-full max-w-4xl max-h-[80vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-200 z-10"
                >
                    ✖
                </button>
                <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
            </div>
        </div>
    );
};

const HDRIGenerator: React.FC = () => {
    const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
    const [generatedHDRI, setGeneratedHDRI] = useState<string | null>(null);
    const [intensity, setIntensity] = useState<number>(1.2);
    const [blur, setBlur] = useState<number>(3);
    const [showModal, setShowModal] = useState(false);

    const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const renderCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    const resizeCanvases = () => {
        if (previewCanvasRef.current && renderCanvasRef.current) {
            previewCanvasRef.current.width = previewCanvasRef.current.offsetWidth;
            previewCanvasRef.current.height = previewCanvasRef.current.offsetHeight;
            renderCanvasRef.current.width = renderCanvasRef.current.offsetWidth;
            renderCanvasRef.current.height = renderCanvasRef.current.offsetHeight;
        }
    };

    useEffect(() => {
        resizeCanvases();
        window.addEventListener("resize", resizeCanvases);
        if (previewCanvasRef.current)
            previewCtxRef.current = previewCanvasRef.current.getContext("2d");
        if (renderCanvasRef.current)
            renderCtxRef.current = renderCanvasRef.current.getContext("2d");
        return () => window.removeEventListener("resize", resizeCanvases);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                setUploadedImage(img);
                drawPreviewImage(img);
            };
            if (ev.target?.result) img.src = ev.target.result as string;
        };
        reader.readAsDataURL(file);
    };

    const drawPreviewImage = (img: HTMLImageElement) => {
        const ctx = previewCtxRef.current;
        const canvas = previewCanvasRef.current;
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        ctx.drawImage(img, x, y, width, height);
    };

    const processHDRI = () => {
        if (!uploadedImage) return;
        const ctx = renderCtxRef.current;
        const canvas = renderCanvasRef.current;
        if (!ctx || !canvas) return;

        canvas.width = 2048;
        canvas.height = 1024;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scale = canvas.height / uploadedImage.height;
        const targetWidth = uploadedImage.width * scale;
        const x = (canvas.width - targetWidth) / 2;
        ctx.drawImage(uploadedImage, x, 0, targetWidth, canvas.height);

        // Mirror left side
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, 0, 0, canvas.width / 2, canvas.height, -canvas.width, 0, canvas.width / 2, canvas.height);
        ctx.restore();

        // Mirror right side
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, canvas.width / 2, 0, canvas.width / 2, canvas.height, -canvas.width / 2, 0, canvas.width / 2, canvas.height);
        ctx.restore();

        applyHDRIEffect();
        setGeneratedHDRI(canvas.toDataURL("image/jpeg", 0.9));
    };

    const applyHDRIEffect = () => {
        const ctx = renderCtxRef.current;
        const canvas = renderCanvasRef.current;
        if (!ctx || !canvas) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * intensity);
            data[i + 1] = Math.min(255, data[i + 1] * intensity);
            data[i + 2] = Math.min(255, data[i + 2] * intensity);
        }
        ctx.putImageData(imageData, 0, 0);

        if (blur > 0) {
            ctx.filter = `blur(${blur}px)`;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = "none";
        }
    };

    // 🔥 Automatically regenerate whenever image, intensity, or blur changes
    useEffect(() => {
        if (uploadedImage) processHDRI();
    }, [uploadedImage, intensity, blur]);

    const downloadHDRI = () => {
        if (!generatedHDRI) return;
        const link = document.createElement("a");
        link.href = generatedHDRI;
        link.download = "hdri-panorama.jpg";
        link.click();
    };

    return (
        <div className="max-w-6xl my-5 mx-auto p-6">
            <h1 className="text-3xl font-bold text-white text-center mb-6">
                360° HDRI Generator
            </h1>

            <div className="bg-gray-900 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-6 text-white">
            <h2 className="text-xl font-semibold mb-3">How it works</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-200">
                <li>Upload any image to transform it into a 360° HDRI environment.</li>
                <li>The algorithm analyzes colors and lighting to create a spherical projection.</li>
                <li>Adjust settings to control the intensity and effects of your HDRI.</li>
                <li>Download your HDRI for use in 3D software or view it in 360° mode.</li>
            </ul>
        </div>

            {/* Upload area */}
            <label className="block w-full border-2 border-dashed border-purple-400 rounded-lg p-6 text-center cursor-pointer mb-6 hover:bg-indigo-50">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <span className="text-gray-700">Click or drag to upload an image</span>
            </label>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 className="text-lg font-medium text-white mb-2">Original Image</h3>
                    <canvas ref={previewCanvasRef} className="w-full h-64 bg-slate-800 rounded-lg" />
                </div>
                <div>
                    <h3 className="text-lg font-medium text-white mb-2">Generated HDRI</h3>
                    <canvas ref={renderCanvasRef} className="w-full h-64 bg-slate-800 rounded-lg" />
                </div>
            </div>

            <div className="bg-gray-900 rounded-xl shadow p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Environment Intensity</label>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={intensity}
                            onChange={(e) => setIntensity(parseFloat(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Blur</label>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={blur}
                            onChange={(e) => setBlur(parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="flex space-x-4">
                    <button
                        onClick={downloadHDRI}
                        disabled={!generatedHDRI}
                        className="flex-1 bg-white border border-purple-600 text-indigo-600 py-2 px-4 rounded-lg hover:bg-purple-50 disabled:opacity-50"
                    >
                        Download
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        disabled={!generatedHDRI}
                        className="flex-1 bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                    >
                        360° View
                    </button>
                </div>
            </div>

            {showModal && generatedHDRI && (
                <ViewerModal src={generatedHDRI} onClose={() => setShowModal(false)} />
            )}
        </div>
    );
};

export default HDRIGenerator;

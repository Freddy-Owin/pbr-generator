import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const HDRLayout: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [textureLoaded, setTextureLoaded] = useState(false);

    // Dropzone
    const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
        setErrorMsg(null);
        setTextureLoaded(false);
        if (fileRejections.length > 0) {
            setErrorMsg("Invalid file type. Only JPG or PNG allowed.");
            return;
        }
        if (!acceptedFiles[0]) return;
        const reader = new FileReader();
        reader.onload = () => setImageSrc(reader.result as string);
        reader.readAsDataURL(acceptedFiles[0]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "image/jpeg": [], "image/png": [] },
        multiple: false,
    });

    // Three.js setup
    useEffect(() => {
        if (!mountRef.current || !imageSrc) return;

        const width = mountRef.current.clientWidth;
        const height = 600;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 0, 0.01);

        // Key fix: preserveDrawingBuffer=true ensures canvas can be exported
        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height, false);
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const loader = new THREE.TextureLoader();
        loader.load(
            imageSrc,
            (texture: THREE.Texture) => {
                const geometry = new THREE.SphereGeometry(50, 64, 64);
                geometry.scale(-1, 1, 1);
                const material = new THREE.MeshBasicMaterial({ map: texture });
                const sphere = new THREE.Mesh(geometry, material);
                scene.add(sphere);
                setTextureLoaded(true);
            },
            undefined,
            () => setErrorMsg("Failed to load texture.")
        );

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, [imageSrc]);

    // Download PNG
    const handleDownloadPNG = () => {
        if (!mountRef.current || !textureLoaded) {
            alert("Please wait until the image is fully loaded.");
            return;
        }
        const canvas = mountRef.current.querySelector("canvas") as HTMLCanvasElement;
        if (!canvas) return;

        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "hdr_preview.png";
        link.click();
    };

    const handleDownloadHDR = () => {
        alert("HDR export placeholder (frontend-only). Currently downloads PNG.");
        handleDownloadPNG();
    };

    const handleDownloadEXR = () => {
        alert("EXR export placeholder (frontend-only). Currently downloads PNG.");
        handleDownloadPNG();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
            {/* Header */}
            <header className="w-full max-w-6xl mb-6">
                <h1 className="text-4xl font-bold text-center">HDR Environment Map Generator</h1>
            </header>

            {/* Central frame */}
            <div className="w-full max-w-6xl border-2 border-gray-600 rounded-lg relative flex flex-col items-center justify-center bg-gray-800">
                {/* Dropzone overlay */}
                {!imageSrc && (
                    <div
                        {...getRootProps()}
                        className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10 ${isDragActive ? "bg-gray-700/70" : "bg-gray-800/70"
                            }`}
                    >
                        <input {...getInputProps()} />
                        <p className="text-center px-4">
                            {isDragActive
                                ? "Drop your 360° image here..."
                                : "Drag & drop a JPG/PNG 360° image, or click to upload"}
                        </p>
                        {errorMsg && <p className="text-red-400 mt-2">{errorMsg}</p>}
                    </div>
                )}

                {/* Three.js preview */}
                <div ref={mountRef} className="w-full" style={{ height: 600 }} />
            </div>

            {/* Action buttons */}
            {imageSrc && (
                <div className="flex gap-4 mt-4">
                    <button
                        onClick={handleDownloadPNG}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                        PNG
                    </button>
                    <button
                        onClick={handleDownloadHDR}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                    >
                        HDR
                    </button>
                    <button
                        onClick={handleDownloadEXR}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                    >
                        EXR
                    </button>
                </div>
            )}
        </div>
    );
};

export default HDRLayout;

import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { removeBackground } from "@imgly/background-removal";

const BgRemoverPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [displayProgress, setDisplayProgress] = useState(0);

    const onDrop = (acceptedFiles: File[]) => {
        setFile(acceptedFiles[0]);
        setResultUrl(null);
        setProgress(0);
        setDisplayProgress(0);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "image/*": [] },
        multiple: false,
    });

    useEffect(() => {
        if (!loading) return;
        const animation = setInterval(() => {
            setDisplayProgress((prev) => {
                if (prev >= progress) {
                    clearInterval(animation);
                    return progress;
                }
                return prev + Math.ceil((progress - prev) / 3);
            });
        }, 50);
        return () => clearInterval(animation);
    }, [progress, loading]);

    const handleGenerate = async () => {
        if (!file) return;
        setLoading(true);
        setProgress(0);
        setDisplayProgress(0);

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return 95;
                return prev + Math.random() * 3;
            });
        }, 100);

        try {
            const blob = await removeBackground(file);
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setProgress(100);
        } catch (err) {
            console.error("Error removing background:", err);
            alert("Failed to remove background");
        } finally {
            clearInterval(interval);
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!resultUrl) return;
        const link = document.createElement("a");
        link.href = resultUrl;
        link.download = file ? `${file.name.split(".")[0]}_no_bg.png` : "output.png";
        link.click();
    };

    return (
        <div className="flex flex-col items-center justify-center gap-6 p-6 w-full min-h-[calc(100vh-100px)]">
            <div className="flex flex-col lg:flex-row gap-6">
                <div
                    {...getRootProps()}
                    className="w-72 h-72 border-4 border-dashed border-gray-400 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-600"
                >
                    <input {...getInputProps()} />
                    {file ? (
                        <img
                            src={URL.createObjectURL(file)}
                            alt="Uploaded"
                            className="object-contain w-full h-full p-2"
                        />
                    ) : isDragActive ? (
                        <p>Drop the image here...</p>
                    ) : (
                        <p>Drag & drop or click to upload</p>
                    )}
                </div>

                <div className="w-72 h-72 border-2 border-gray-400 rounded-lg flex items-center justify-center relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center w-full">
                            <p className="text-white mb-2 font-medium">{Math.floor(displayProgress)}%</p>
                            <div className="w-56 h-3 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-3 bg-purple-500 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : resultUrl ? (
                        <img src={resultUrl} alt="No Background" className="object-contain w-full h-full" />
                    ) : (
                        <p className="text-gray-400">Result will appear here</p>
                    )}
                </div>
            </div>

            <div className="flex gap-4 flex-wrap justify-center mt-4">
                <button
                    onClick={handleGenerate}
                    disabled={!file || loading}
                    className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 transition-colors"
                >
                    {loading ? "Processing..." : "Generate"}
                </button>

                {resultUrl && (
                    <button
                        onClick={handleDownload}
                        className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                        Download
                    </button>
                )}
            </div>
        </div>
    );
};

export default BgRemoverPage;

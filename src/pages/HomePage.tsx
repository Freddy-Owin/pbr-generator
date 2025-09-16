import result from "../assets/bg-remover-example/bee_no_bg.png";
import no_bg from "../assets/bg-remover-example/bee.jpg";
import original from "../assets/pbr-example/original.jpg";
import normal from "../assets/pbr-example/normal.png";
import roughness from "../assets/pbr-example/roughness.png";
import specular from "../assets/pbr-example/specular.png";
import texture from "../assets/seamless/texture.jpg";
import textureExample from "../assets/seamless/texture-example.png";
import palette from "../assets/palette-extractor/palette.png";
import { useNavigate } from "react-router-dom";
import { paths } from "../utils/path";

function Card({ children }: { children: React.ReactNode }) {
    return <div className="bg-gray-900 rounded-2xl shadow-lg p-4">{children}</div>;
}

function Button({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition w-[200px] ${className}`}
        >
            {children}
        </button>
    );
}


export default function Home() {
    const navigate = useNavigate();

    return (
        <>
            <section className="text-center max-w-4xl mx-auto my-20 px-4">
                <h2 className="text-2xl md:text-3xl text-gray-300">First ICT Solution For</h2>
                <h1 className="text-5xl md:text-7xl font-bold text-purple-400 my-5">Smarter Future</h1>
                <p className="text-gray-400 my-5">
                    We provide innovative technology solutions that empower businesses to streamline their operations,
                    boost productivity, and unlock new opportunities. From AI-powered tools to advanced design software,
                    we bring your ideas to life with cutting-edge technology.
                </p>
                <Button
                    className="mt-6 border border-purple-500 bg-transparent text-purple-400 hover:bg-purple-500 hover:text-black"
                    onClick={() => navigate(paths.pbrGenerator)}
                >
                    Get Started
                </Button>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-12 my-20 max-w-6xl mx-auto px-6">
                <div className="flex flex-col justify-center">
                    <h2 className="text-3xl font-bold">PBR Generator</h2>
                    <p className="text-gray-400 mt-4 font-inter text-[16px]">
                        Create professional Physically Based Rendering (PBR) textures instantly. Upload any image, and
                        our generator will produce high-quality Normal, Roughness, Specular, and Displacement maps
                        ready for use in 3D projects, games, or animations. Adjust parameters live to match your
                        exact needs.
                    </p>
                    <Button
                        className="mt-6 border border-purple-500 bg-transparent text-purple-400 hover:bg-purple-500 hover:text-black"
                        onClick={() => navigate(paths.pbrGenerator)}
                    >
                        Generate Now
                    </Button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <Card>
                        <div className="flex flex-col items-center gap-3">
                            <p>Original</p>
                            <img src={original} alt="Original" width={300} height={200} className="rounded-lg" />
                        </div>
                    </Card>
                    <Card>
                        <div className="flex flex-col items-center gap-3">
                            <p>Roughness</p>
                            <img src={roughness} alt="Roughness" width={300} height={200} className="rounded-lg" />
                        </div>
                    </Card>
                    <Card>
                        <div className="flex flex-col items-center gap-3">
                            <p>Normal Map</p>
                            <img src={normal} alt="Normal Map" width={300} height={200} className="rounded-lg" />
                        </div>
                    </Card>
                    <Card>
                        <div className="flex flex-col items-center gap-3">
                            <p>Specular</p>
                            <img src={specular} alt="Specular" width={300} height={200} className="rounded-lg" />
                        </div>
                    </Card>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-12 my-20 max-w-6xl mx-auto px-6">
                <div className="flex flex-col items-center md:items-start">
                    <div className="grid grid-cols-2 gap-6">
                        <Card>
                            <div className="flex flex-col items-center gap-3">
                                <p>Original</p>
                                <img src={no_bg} alt="Original" width={300} height={200} className="rounded-lg" />
                            </div>
                        </Card>
                        <Card>
                            <div className="flex flex-col items-center gap-3">
                                <p>Result</p>
                                <img src={result} alt="Result" width={300} height={200} className="rounded-lg" />
                            </div>
                        </Card>
                    </div>
                </div>
                <div className="flex flex-col justify-center">
                    <h2 className="text-3xl font-bold">Background Remover</h2>
                    <p className="text-gray-400 mt-4 font-inter text-[16px]">
                        Easily remove backgrounds from your images in seconds. Our AI-powered tool automatically detects
                        the subject and separates it from the background, giving you clean cutouts for marketing materials,
                        product photos, social media, or design projects.
                    </p>
                    <Button
                        className="mt-6 border border-purple-500 bg-transparent text-purple-400 hover:bg-purple-500 hover:text-black"
                        onClick={() => navigate(paths.bgRemover)}
                    >
                        Generate Now
                    </Button>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-12 my-20 max-w-6xl mx-auto px-6">
                <div className="flex flex-col justify-center">
                    <h2 className="text-3xl font-bold">Seamless Texture</h2>
                    <p className="text-gray-400 mt-4 font-inter text-[16px]">
                        Generate high-quality seamless textures effortlessly. Upload any image, and our AI-powered generator
                        will create tiles that repeat perfectly in 3D models, game environments, or design projects. Customize
                        patterns and parameters to match your creative vision.
                    </p>
                    <Button
                        className="mt-6 border border-purple-500 bg-transparent text-purple-400 hover:bg-purple-500 hover:text-black"
                        onClick={() => navigate(paths.seamlessTexture)}
                    >
                        Generate Now
                    </Button>
                </div>
                <div className="flex flex-col items-center md:items-start">
                    <div className="grid grid-cols-2 gap-6">
                        <Card>
                            <div className="flex flex-col items-center gap-3">
                                <p>Original</p>
                                <img src={texture} alt="Original" width={300} height={200} className="rounded-lg" />
                            </div>
                        </Card>
                        <Card>
                            <div className="flex flex-col items-center gap-3">
                                <p>Example</p>
                                <img src={textureExample} alt="Example" width={300} height={200} className="rounded-lg" />
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-12 my-20 max-w-6xl mx-auto px-6">
                <div className="flex flex-col items-center md:items-start">
                    <div className="grid grid-cols-2 gap-6">
                        <Card>
                            <div className="flex flex-col items-center gap-3">
                                <p>Original Image</p>
                                <img src={no_bg} alt="Original" width={300} height={200} className="rounded-lg" />
                            </div>
                        </Card>
                        <Card>
                            <div className="flex flex-col items-center gap-3">
                                <p>Result</p>
                                <img src={palette} alt="Result" width={300} height={200} className="rounded-lg" />
                            </div>
                        </Card>
                    </div>
                </div>
                <div className="flex flex-col justify-center">
                    <h2 className="text-3xl font-bold">Palette Extractor</h2>
                    <p className="text-gray-400 mt-4 font-inter text-[16px]">
                        Instantly extract color palettes from any image. Our tool detects key colors and generates harmonious
                        palettes that you can use for branding, web design, UI/UX projects, or creative inspiration.
                        Download the palette or integrate it directly into your workflow.
                    </p>
                    <Button
                        className="mt-6 border border-purple-500 bg-transparent text-purple-400 hover:bg-purple-500 hover:text-black"
                        onClick={() => navigate(paths.paletteExtractor)}
                    >
                        Generate Now
                    </Button>
                </div>
            </section>
        </>
    );
}

import { Route, Routes } from "react-router-dom"
import { paths } from "../utils/path"
import Home from "../pages/HomePage"
import BgRemoverPage from "../pages/BgRemoverPage"
import Navbar from "../layout/Navbar"
import { Footer } from "../layout/Footer"
import PbrGeneratorPage from "../pages/PbrGeneratorPage"
import AboutUsPage from "../pages/AboutUsPage"
import ContactUsPage from "../pages/ContactUsPage"
import PaletteExtractor from "../pages/PaletteExtractor"
import SeamlessTextureMaker from "../pages/SeamlessTextureMaker"
import ScrollToTop from "../layout/ScrollTop"

export const AppRouter = () => {
    return (
        <main className="min-h-screen flex flex-col font-bruno text-[12px] bg-black text-white">
            <Navbar />
            <div className="flex-grow w-full flex flex-col justify-center items-center">
                <ScrollToTop />
                <Routes>
                    <Route path={paths.home} element={<Home />} />
                    <Route path={paths.bgRemover} element={<BgRemoverPage />} />
                    <Route path={paths.pbrGenerator} element={<PbrGeneratorPage />} />
                    <Route path={paths.aboutUs} element={<AboutUsPage />} />
                    <Route path={paths.contactUs} element={<ContactUsPage />} />
                    <Route path={paths.paletteExtractor} element={<PaletteExtractor />} />
                    <Route path={paths.seamlessTexture} element={<SeamlessTextureMaker />} />
                </Routes>
            </div>
            <Footer />
        </main>
    );
};

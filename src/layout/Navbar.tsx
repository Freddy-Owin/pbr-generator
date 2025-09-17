import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo/app-logo.png";
import { paths } from "../utils/path";

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="flex justify-center items-center w-full mt-10 font-inter text-[14px]">
            <nav className="relative flex items-center justify-between bg-black border border-purple-500 rounded-full w-[850px] max-w-full px-10 py-3 text-white font-medium">

                <div className="hidden md:flex space-x-6 whitespace-nowrap">
                    <p onClick={() => navigate(paths.pbrGenerator)} className="hover:text-purple-400 hover:cursor-pointer transition-colors">PBR</p>
                    <p onClick={() => navigate(paths.photoToVector)} className="hover:text-purple-400 hover:cursor-pointer transition-colors">Image to Vector</p>
                    <p onClick={() => navigate(paths.hdrMap)} className="hover:text-purple-400 hover:cursor-pointer transition-colors">HDRI Converter</p>
                </div>

                <div className="hidden md:flex space-x-6 whitespace-nowrap">
                    <p onClick={() => navigate(paths.bgRemover)} className="hover:text-purple-400 hover:cursor-pointer transition-colors">Background Remover</p>
                    <p onClick={() => navigate(paths.aboutUs)} className="hover:text-purple-400 hover:cursor-pointer transition-colors">About Us</p>
                    <p onClick={() => navigate(paths.contactUs)} className="hover:text-purple-400 hover:cursor-pointer transition-colors">Contact Us</p>
                </div>

                <div
                    onClick={() => navigate("/")}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer"
                >
                    <div className="bg-black border border-purple-500 rounded-full w-20 h-20 flex items-center justify-center hover:scale-105 transition-transform">
                        <img src={logo} alt="logo" className="w-15 h-15 object-contain" />
                    </div>
                </div>

                <button
                    className="md:hidden ml-auto text-purple-400"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {isOpen && (
                    <div className="absolute top-full mt-3 left-0 w-full bg-black border border-purple-500 rounded-xl flex flex-col items-center py-4 space-y-4 md:hidden z-50">
                        <p onClick={() => navigate(paths.pbrGenerator)} className="hover:text-purple-400 transition-colors">PBR</p>
                        <p onClick={() => navigate(paths.photoToVector)} className="hover:text-purple-400 transition-colors">Image to Vector</p>
                        <p onClick={() => navigate(paths.hdrMap)} className="hover:text-purple-400 transition-colors">HDRI Converter</p>
                        <p onClick={() => navigate(paths.bgRemover)} className="hover:text-purple-400 transition-colors">Background Remover</p>
                        <p onClick={() => navigate(paths.aboutUs)} className="hover:text-purple-400 transition-colors">About Us</p>
                        <p onClick={() => navigate(paths.contactUs)} className="hover:text-purple-400 transition-colors">Contact Us</p>
                    </div>
                )}
            </nav>
        </div>
    );
};

export default Navbar;

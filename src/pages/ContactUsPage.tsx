export default function ContactUs() {
    return (
        <div className="max-w-4xl mx-auto p-6 my-16 text-gray-300">
            <h1 className="text-4xl md:text-5xl font-bold text-purple-400 mb-6">Contact Us</h1>
            <p className="text-lg mb-10">
                We are happy to connect with you! Reach out through any of the following channels.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg">
                <div className="group">
                    <p className="font-semibold text-purple-400">Email</p>
                    <a
                        href="mailto:kyawyelin.business@gmail.com"
                        className="block mt-1 hover:text-white transition-colors"
                    >
                        kyawyelin.business@gmail.com
                    </a>
                </div>

                <div className="group">
                    <p className="font-semibold text-purple-400">Phone</p>
                    <a
                        href="tel:+959123456789"
                        className="block mt-1 hover:text-white transition-colors"
                    >
                        +95 9 752 446 774
                    </a>
                </div>

                <div className="group">
                    <p className="font-semibold text-purple-400">LinkedIn</p>
                    <a
                        href="https://www.linkedin.com/in/kyaw-ye-lin-730212210/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-1 hover:text-white transition-colors"
                    >
                        linkedin.com/in/kyaw-ye-lin-730212210/
                    </a>
                </div>

                <div className="group">
                    <p className="font-semibold text-purple-400">Telegram</p>
                    <a
                        href="https://t.me/kyawyelin382000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-1 hover:text-white transition-colors"
                    >
                        t.me/kyawyelin382000
                    </a>
                </div>

                <div className="group">
                    <p className="font-semibold text-purple-400">Viber</p>
                    <a
                        href="viber://chat?number=%2B959123456789"
                        className="block mt-1 hover:text-white transition-colors"
                    >
                        +95 9 976 923 404
                    </a>
                </div>

                <div className="group">
                    <p className="font-semibold text-purple-400">Address</p>
                    <p className="mt-1 hover:text-white transition-colors">
                        Shwepyithar, Yangon, Myanmar
                    </p>
                </div>
            </div>
        </div>
    );
}

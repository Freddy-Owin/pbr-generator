interface Props {
    title: string;
    src: string;
}

export default function MapPreview({ title, src }: Props) {
    return (
        <div className="bg-gray-800 p-3 rounded-lg shadow">
            <h2 className="text-center font-semibold mb-2">{title}</h2>
            <img src={src} alt={title} className="rounded" />
        </div>
    );
}

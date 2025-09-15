interface Props {
    strength: number;
    onChange: (value: number) => void;
    onDownload: () => void;
}

export default function Controls({ strength, onChange, onDownload }: Props) {
    return (
        <div className="flex items-center justify-center gap-4 mt-6">
            <button
                onClick={() => onChange(Math.max(0.1, strength - 0.1))}
                className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
                ➖
            </button>
            <input
                type="number"
                step="0.1"
                value={strength}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-20 text-white rounded px-2 py-1"
            />
            <button
                onClick={() => onChange(strength + 0.1)}
                className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
                ➕
            </button>

            <button
                onClick={onDownload}
                className="ml-6 px-4 py-2 bg-green-600 rounded hover:bg-green-500"
            >
                ⬇️ Download All
            </button>
        </div>
    );
}

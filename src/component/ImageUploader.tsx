interface Props {
    onUpload: (file: File) => void;
}

export default function ImageUploader({ onUpload }: Props) {
    return (
        <div className="flex justify-center my-5">
            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(file);
                }}
                className="file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-blue-600 file:text-white
                   hover:file:bg-blue-700"
            />
        </div>
    );
}

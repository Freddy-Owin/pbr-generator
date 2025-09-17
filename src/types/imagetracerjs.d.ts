declare module "imagetracerjs" {
    interface ImageTracerOptions {
        ltres?: number;          // line threshold
        qtres?: number;          // quadratic threshold
        scale?: number;          // scaling factor
        strokewidth?: number;    // stroke width for vector lines
        [key: string]: any;      // allow other options
    }

    export function imagedataToSVG(
        imageData: ImageData,
        options?: ImageTracerOptions
    ): string;

    const ImageTracer: {
        imagedataToSVG: typeof imagedataToSVG;
        [key: string]: any;
    };

    export default ImageTracer;
}

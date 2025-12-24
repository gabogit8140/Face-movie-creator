import { GoogleGenAI, Type } from "@google/genai";
import { Face } from '../types';

let ai: GoogleGenAI | null = null;

const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

const faceDetectionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            box: {
                type: Type.OBJECT,
                description: "Bounding box of the face, normalized from 0 to 1.",
                properties: {
                    x: { type: Type.NUMBER, description: "Top-left corner x-coordinate." },
                    y: { type: Type.NUMBER, description: "Top-left corner y-coordinate." },
                    width: { type: Type.NUMBER },
                    height: { type: Type.NUMBER },
                },
                required: ["x", "y", "width", "height"],
            },
            landmarks: {
                type: Type.OBJECT,
                description: "Key facial landmarks, normalized from 0 to 1.",
                properties: {
                    left_pupil: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                        },
                         required: ["x", "y"],
                    },
                    right_pupil: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                        },
                        required: ["x", "y"],
                    },
                },
                required: ["left_pupil", "right_pupil"],
            },
        },
        required: ["box", "landmarks"],
    },
};

export const analyzeImageForFaces = async (base64ImageData: string): Promise<Face[]> => {
    try {
        const genAI = getAI();
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64ImageData,
                        },
                    },
                    {
                        text: "Analyze this image to find all human faces. For each face, provide a bounding box and precise landmarks for the center of the left_pupil and right_pupil. The landmarks are critical for alignment and must be as accurate as possible. The landmarks must be from the subject's perspective (e.g., 'left_pupil' is the person's own left pupil). Return the data as a JSON array of objects. Each object must have a 'box' property (with normalized x, y, width, height) and a 'landmarks' property (with 'left_pupil' and 'right_pupil', each with normalized x, y). All coordinates must be normalized from 0.0 to 1.0. If no faces are found, you must return an empty array.",
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: faceDetectionSchema,
            },
        });

        const jsonString = response.text.trim();
        const detectedFaces = JSON.parse(jsonString);

        if (Array.isArray(detectedFaces)) {
            return detectedFaces.map((face, index) => ({
                ...face,
                id: `face-${Date.now()}-${index}`,
            }));
        }
        return [];
    } catch (error) {
        console.error("Error analyzing image with Gemini:", error);
        throw new Error("Failed to detect faces in the image.");
    }
};
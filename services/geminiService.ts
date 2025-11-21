import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { AspectRatio } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const promptGenerationModel = "gemini-2.5-flash";
const imageGenerationModel = "gemini-2.5-flash-image";

export const generatePromptsFromScript = async (
  script: string,
  niche: string,
  aiInstruction: string
): Promise<string[]> => {
  const prompt = `
    Script:
    ---
    ${script}
    ---
    Niche/Topic: ${niche}
    ---
    Instructions:
    ${aiInstruction}
  `;

  const response = await ai.models.generateContent({
    model: promptGenerationModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompts: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              description: "A detailed visual prompt for an image generation model.",
            },
          },
        },
        required: ["prompts"],
      },
    },
  });
  
  const jsonText = response.text.trim();
  const result = JSON.parse(jsonText);
  return result.prompts || [];
};

const dataUrlToGeminiPart = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    const base64Data = parts[1];
    return {
        inlineData: {
            data: base64Data,
            mimeType: mimeType,
        },
    };
}

export const generateImageFromPrompt = async (
  prompt: string,
  styleKeywords: string,
  aspectRatio: AspectRatio,
  referenceImageUrl: string | null
): Promise<string> => {
    let fullPrompt = `Create an image with aspect ratio ${aspectRatio}. The image should depict: "${prompt}". Additional style keywords: ${styleKeywords}.`;
    if (referenceImageUrl) {
        fullPrompt = `Analyze the style of the provided reference image and generate a new image with a similar style. The new image should have an aspect ratio of ${aspectRatio} and depict: "${prompt}". Additional style keywords: ${styleKeywords}.`
    }
    
    const contentParts: any[] = [];

    if (referenceImageUrl) {
        contentParts.push(dataUrlToGeminiPart(referenceImageUrl));
    }
    contentParts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
        model: imageGenerationModel,
        contents: {
          parts: contentParts,
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts) {
      throw new Error("Image generation failed, no content parts returned.");
    }

    for (const part of parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        return `data:${mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("Image generation failed, no images returned.");
};

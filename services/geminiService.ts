import { GoogleGenAI } from "@google/genai";
import { AIActionType } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const processNoteWithAI = async (
  content: string, 
  action: AIActionType
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return content;

  let prompt = "";
  switch (action) {
    case AIActionType.FIX_GRAMMAR:
      prompt = `Correct the grammar and spelling of the following text. Maintain the original tone and style. Return only the corrected text:\n\n${content}`;
      break;
    case AIActionType.SUMMARIZE:
      prompt = `Summarize the following text into a concise paragraph. Return only the summary:\n\n${content}`;
      break;
    case AIActionType.CONTINUE_WRITING:
      prompt = `Continue writing the following text naturally. Add about 2-3 sentences. Return only the added text (I will append it myself) or the full continued text if it flows better:\n\n${content}`;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || content;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to process text with AI");
  }
};
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { GEMINI_TEXT_MODEL } from '../constants';
import { AISummaryRequest, Language, GeminiResponseData, GroundingChunk } from '../types';
import { parseGeminiJsonResponse } from '../utils/appUtils';

// Ensure API_KEY is available. In a real build process, this would be set.
// For development, you might temporarily set it here or use a .env file (not part of this deliverable).
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY for Gemini is not set. AI features will not work. Set process.env.API_KEY.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const generateCommitteeSummary = async (request: AISummaryRequest): Promise<string> => {
  if (!ai) return "AI Service not available (API Key missing).";
  
  const langPrompt = request.language === Language.UR 
    ? "براہ کرم کمیٹی کا خلاصہ اردو میں فراہم کریں۔" 
    : "Please provide a summary for the committee in English.";

  const prompt = `
    ${langPrompt}
    Committee Title: ${request.committeeTitle}
    Total Members: ${request.totalMembers}
    Members with Pending Payments this month: ${request.pendingPayments}
    
    Generate a concise, informative summary. If pending payments are high, express mild concern.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: request.language === Language.UR ? { systemInstruction: "You are a helpful assistant providing summaries in fluent Urdu." } : {}
    });
    return response.text;
  } catch (error) {
    console.error("Error generating committee summary");
    if (request.language === Language.UR) {
      return "خلاصہ تیار کرنے میں خرابی۔";
    }
    return "Error generating summary.";
  }
};

export const generateUrduNotification = async (memberName: string, isLate: boolean): Promise<string> => {
  if (!ai) return "AI سروس دستیاب نہیں ہے۔";

  const prompt = isLate
    ? ` ${memberName} کی جانب سے کمیٹی کی قسط میں تاخیر ہوئی ہے۔ ایک مختصر، شائستہ یاد دہانی کا پیغام بنائیں۔`
    : ` ${memberName} کی کمیٹی کی قسط جلد واجب الادا ہے۔ ایک مختصر، دوستانہ یاد دہانی کا پیغام بنائیں۔`;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: { systemInstruction: "You generate polite reminder messages in Urdu for a savings committee app." }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating Urdu notification");
    return "اردو اطلاع بنانے میں خرابی۔";
  }
};

// Example of generating JSON (e.g., for risk assessment - conceptual)
interface RiskAssessment {
  memberId: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

export const assessPaymentRisk = async (memberName: string, paymentHistory: string, language: Language): Promise<RiskAssessment | string> => {
  if (!ai) return "AI Service not available.";

  const langSpecificInstructions = language === Language.UR
    ? "براہ کرم ادائیگی کے خطرے کا اندازہ اردو میں فراہم کریں۔"
    : "Please provide the payment risk assessment in English.";

  const prompt = `
    ${langSpecificInstructions}
    Analyze the payment risk for member "${memberName}" based on this history: "${paymentHistory}".
    Return a JSON object with fields: "memberId" (string, use "${memberName}"), "riskLevel" (enum: "low", "medium", "high"), and "reason" (string, a brief explanation).
    Example history: "Paid on time for 3 months, then 2 days late, then 5 days late."
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        systemInstruction: `You are an AI assistant that assesses payment risk and provides output in JSON format. ${langSpecificInstructions}`
       }
    });
    
    const parsedJson = parseGeminiJsonResponse<RiskAssessment>(response.text);
    if (parsedJson) {
      return parsedJson;
    } else {
      return language === Language.UR ? "JSON جواب کو پارس کرنے میں ناکامی۔" : "Failed to parse JSON response.";
    }

  } catch (error) {
    console.error("Error assessing payment risk");
    return language === Language.UR ? "ادائیگی کے خطرے کا اندازہ لگانے میں خرابی۔" : "Error assessing payment risk.";
  }
};

export const getInfoWithGoogleSearch = async (query: string): Promise<GeminiResponseData> => {
  if (!ai) return { text: "AI Service not available (API Key missing)." };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL, // Or a model that explicitly supports tools well
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    return {
      text: response.text,
      candidates: response.candidates,
    };

  } catch (error) {
    console.error("Error with Google Search grounding");
    return { text: "Error fetching information with Google Search." };
  }
};

let chatInstance: Chat | null = null;

export const startOrContinueChat = async (message: string, systemInstruction?: string): Promise<string> => {
  if (!ai) return "AI Service not available.";

  if (!chatInstance) {
    chatInstance = ai.chats.create({
      model: GEMINI_TEXT_MODEL,
      config: { systemInstruction: systemInstruction || "You are a helpful assistant." }
    });
  }
  
  try {
    const response: GenerateContentResponse = await chatInstance.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error in chat");
    chatInstance = null; // Reset chat on error
    return "Error in chat communication.";
  }
};

export const generateImageDescription = async (imageUrl: string, promptText: string): Promise<string> => {
    if (!ai) return "AI Service not available (API Key missing).";

    // This is a conceptual example. Actual image understanding requires a multimodal model
    // and proper handling of image data (e.g., base64 string).
    // The current `generateContent` with GEMINI_TEXT_MODEL won't process actual image bytes from a URL directly.
    // For a true multimodal interaction, you'd send image data as Part.
    
    // Simulating a multimodal prompt structure for conceptual clarity:
    const prompt = `Describe the key elements in the image provided at ${imageUrl}. ${promptText}`;
    
    // If you had the image as a base64 string:
    // const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64ImageData } };
    // const textPart = { text: promptText };
    // const contents = { parts: [imagePart, textPart] };
    // model would be like 'gemini-1.5-flash-latest' or similar multimodal model

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL, // Using text model for this simplified example
            contents: prompt, // Sending URL as text, model will treat it as text
        });
        return response.text;
    } catch (error) {
        console.error("Error generating image description");
        return "Error generating image description.";
    }
};


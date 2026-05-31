import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize GoogleGenAI securely server-side.
// We set user-agent to 'aistudio-build' for AI Studio's infrastructure analytics.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json());

// Secure API endpoint to invoke Gemini AI for Theme Generation
app.post("/api/generate-theme", async (req, res) => {
  const { vibe } = req.body;

  if (!vibe || typeof vibe !== "string") {
    res.status(400).json({ error: "Please provide a theme vibe prompt or instruction" });
    return;
  }

  try {
    const prompt = `You are a professional lead UI/UX Design System specialist and developer.
Analyze the following design vibe description: "${vibe}"
Based on this vibe, design a fully responsive and cohesive set of UI Design Tokens (colors, typography scales, layout radius, card shadows, section spacing and gaps).
Your selection MUST be highly elegant, aesthetic, of professional visual craft, and meet WCAG AA contrast standards (e.g. contrast ratio of at least 4.5:1 for standard body text against background/surface colors).

Output a structured JSON conforming strictly to the requested schema. Provide creative custom values suitable for "${vibe}" while keeping them completely functional.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert creative UI/UX designer and design system architect. Always return a perfectly themed design tokens object that results in beautiful, accessible and modern layouts.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          description: "A complete set of design tokens.",
          properties: {
            primary: {
              type: Type.STRING,
              description: "Brand primary color hex code (e.g. '#6366f1'). Must contrast beautifully with the background & surface.",
            },
            secondary: {
              type: Type.STRING,
              description: "Complementary accent color hex code.",
            },
            background: {
              type: Type.STRING,
              description: "Background color hex code (typically a very light background like '#f8fafc' or a deep slate dark background like '#09090b').",
            },
            surface: {
              type: Type.STRING,
              description: "Card or overlay surface background hex code. Must contrast slightly with the general background (e.g. '#ffffff' on '#f4f4f5' or '#18181b' on '#09090b').",
            },
            textPrimary: {
              type: Type.STRING,
              description: "Primary body text color hex code. Must contrast highly against background/surface (at least 4.5:1 ratio).",
            },
            textSecondary: {
              type: Type.STRING,
              description: "Secondary muted subtitle/caption text color hex code.",
            },
            border: {
              type: Type.STRING,
              description: "Divider and border color hex code. Needs to be a subtle tint (e.g., '#cbd5e1' or '#27272a').",
            },
            fontDisplay: {
              type: Type.STRING,
              enum: ["sans", "mono", "serif", "grotesk", "playfair"],
              description: "Heading typography font pairing selection.",
            },
            fontBody: {
              type: Type.STRING,
              enum: ["sans", "mono", "serif"],
              description: "Body typography font selection for density and high comfort reading.",
            },
            sizeScale: {
              type: Type.STRING,
              enum: ["compact", "balanced", "spacious"],
              description: "Global font sizing density.",
            },
            letterSpacing: {
              type: Type.STRING,
              enum: ["tight", "normal", "wide"],
              description: "Letter-spacing tracking variable.",
            },
            lineHeight: {
              type: Type.STRING,
              enum: ["snug", "normal", "relaxed"],
              description: "Line height text leading multiplier.",
            },
            radiusCard: {
              type: Type.STRING,
              enum: ["none", "sm", "md", "lg", "xl", "2xl", "full"],
              description: "Border-radius scale for main cards and widgets.",
            },
            radiusButton: {
              type: Type.STRING,
              enum: ["none", "sm", "md", "lg", "full"],
              description: "Border-radius scale for standard button and interaction targets.",
            },
            shadowCard: {
              type: Type.STRING,
              enum: ["none", "sm", "md", "lg", "xl", "inner"],
              description: "Visual elevation depth shadow preset.",
            },
            borderWidth: {
              type: Type.STRING,
              enum: ["0px", "1px", "2px"],
              description: "Border thickness of system elements.",
            },
            paddingCard: {
              type: Type.STRING,
              enum: ["none", "xs", "sm", "md", "lg", "xl"],
              description: "Internal content boundary padding of widgets.",
            },
            gapSize: {
              type: Type.STRING,
              enum: ["xs", "sm", "md", "lg"],
              description: "Spacing item margin and grid flex gaps.",
            },
          },
          required: [
            "primary",
            "secondary",
            "background",
            "surface",
            "textPrimary",
            "textSecondary",
            "border",
            "fontDisplay",
            "fontBody",
            "sizeScale",
            "letterSpacing",
            "lineHeight",
            "radiusCard",
            "radiusButton",
            "shadowCard",
            "borderWidth",
            "paddingCard",
            "gapSize",
          ],
        },
      },
    });

    const generatedText = response.text;
    if (!generatedText) {
      throw new Error("Gemini returned empty response text");
    }

    const tokens = JSON.parse(generatedText.trim());
    res.json({ success: true, tokens, modelUsed: "gemini-3.5-flash" });
  } catch (error: any) {
    console.error("Gemini Theme Generation API Error:", error);
    res.status(500).json({
      error: "Failed to generate design system tokens using AI",
      details: error.message || error,
    });
  }
});

// Configure Vite middleware integration
async function bootServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Express + hot dev routing proxying to Vite
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production compiled asset serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RePolish Server] Full-stack engine listening on http://0.0.0.0:${PORT}`);
  });
}

bootServer();

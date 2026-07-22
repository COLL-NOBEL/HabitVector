import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const handleApiError = (res: any, error: any, defaultMessage: string) => {
    let message = error.message || defaultMessage;
    let status = 500;

    // Attempt to parse API Error json if it exists
    if (error.message) {
        if (error.message.includes("429") || error.message.includes("Quota")) {
            status = 429;
            message =
                "Rate limit exceeded. Please wait a moment or add your own API key in Settings.";
        } else if (
            error.message.includes("400") ||
            error.message.includes("403") ||
            error.message.includes("API_KEY_INVALID")
        ) {
            status = 400;
            message =
                "Invalid API Key or authorization error. Please check your custom Gemini API key in Settings.";
        }
    }

    res.status(status).json({ error: message, originalError: error.message });
};

app.use(express.json());

// Lazy initialization of the GoogleGenAI SDK to prevent app crash on startup
let aiClient: GoogleGenAI | null = null;

function getAI(req?: any): GoogleGenAI {
    const headerKey = req?.headers?.["x-gemini-api-key"];
    const customKey =
        typeof headerKey === "string"
            ? headerKey.trim()
            : Array.isArray(headerKey)
              ? headerKey[0].trim()
              : null;

    if (customKey && customKey.length > 5) {
        return new GoogleGenAI({
            apiKey: customKey,
            httpOptions: {
                headers: {
                    "User-Agent": "aistudio-build",
                },
            },
        });
    }

    if (!aiClient) {
        const apiKey =
            process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error(
                "GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.",
            );
        }
        aiClient = new GoogleGenAI({
            apiKey,
            httpOptions: {
                headers: {
                    "User-Agent": "aistudio-build",
                },
            },
        });
    }
    return aiClient;
}

// 1. API Endpoint: Generate custom timetable and to-do list based on user goals
app.post(["/api/generate-plan", "/generate-plan"], async (req, res) => {
    try {
        const {
            interests,
            educationLevel,
            hoursPerDay,
            daysPerWeek,
            examDate,
            currentProblems,
        } = req.body;
        const ai = getAI(req);

        const prompt = `
      You are an expert scheduler, mentor, and coach, deeply inspired by James Clear's "Atomic Habits".
      Create a customized Atomic Habit plan, complete with an actionable To-Do List (Tasks) and a Multi-Week Timetable (Missions), for a user with the following profile:
      - Core Interests & Goals: ${interests || "Computer engineering, learning React"}
      - Education Level: ${educationLevel || "Not specified"}
      - Target commitment: ${hoursPerDay || 4} hours per day, ${daysPerWeek || 3} days per week
      - Target Exam/Deadline Date: ${examDate || "None"}
      - Current Struggles: ${currentProblems || "procrastinates"}

      Instructions:
      1. Create 3-5 major tasks in the to-do list. Each task should have an ID (e.g. "task-1").
      2. Spread the tasks across a 4-week timetable (weekIndex 0 to 3). Create daily timetable events (missions) that link to these tasks via taskId.
      3. Make sure to propose atomic habits. Include gaming and leisure time.
      4. Ensure all IDs are strings. 
      5. Provide the output as JSON.
    `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["timetable", "todoList", "coachingTips"],
                    properties: {
                        timetable: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                required: [
                                    "id",
                                    "weekIndex",
                                    "day",
                                    "timeRange",
                                    "activity",
                                    "category",
                                    "description",
                                    "colorPreset",
                                ],
                                properties: {
                                    id: { type: Type.STRING },
                                    taskId: { type: Type.STRING },
                                    weekIndex: {
                                        type: Type.INTEGER,
                                        description:
                                            "0 for week 1, 1 for week 2, 2 for week 3, 3 for week 4",
                                    },
                                    day: {
                                        type: Type.STRING,
                                        description:
                                            "'Monday', 'Tuesday', etc.",
                                    },
                                    timeRange: { type: Type.STRING },
                                    activity: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    colorPreset: { type: Type.STRING },
                                },
                            },
                        },
                        todoList: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                required: [
                                    "id",
                                    "title",
                                    "category",
                                    "priority",
                                    "estimatedMinutes",
                                    "atomicActionStep",
                                    "period",
                                ],
                                properties: {
                                    id: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    priority: { type: Type.STRING },
                                    estimatedMinutes: { type: Type.INTEGER },
                                    atomicActionStep: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    resources: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                    },
                                },
                            },
                        },
                        coachingTips: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                required: [
                                    "rule",
                                    "explanation",
                                    "actionableChallenge",
                                ],
                                properties: {
                                    rule: { type: Type.STRING },
                                    explanation: { type: Type.STRING },
                                    actionableChallenge: { type: Type.STRING },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!response.text) {
            throw new Error("Empty response from AI model.");
        }

        const data = JSON.parse(response.text.trim());
        res.json(data);
    } catch (error: any) {
        if (
            !error.message?.includes("429") &&
            !error.message?.includes("Quota")
        ) {
            console.error("Generate Plan Error:", error);
        }

        handleApiError(res, error, "Failed to generate plan.");
    }
});

// API Endpoint: Generate timetable from existing tasks with dates
app.post(
    ["/api/generate-timetable-from-tasks", "/generate-timetable-from-tasks"],
    async (req, res) => {
        try {
            const { todoList } = req.body;
            const ai = getAI(req);

            const prompt = `
      You are an expert scheduler.
      The user has provided a list of tasks (To-Do list) with optional start and end dates.
      Generate a set of timetable events (missions) that fulfill these tasks within their specified date ranges.
      Spread the tasks across a 4-week timetable (weekIndex 0 to 3) appropriately based on their start and end dates. 
      If a task has no dates, schedule it in weekIndex 0 or 1.
      Create daily timetable events that link to these tasks via taskId.
      
      Tasks: ${JSON.stringify(todoList, null, 2)}
      
      Return the output strictly in the requested JSON format.
    `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        required: ["timetable"],
                        properties: {
                            timetable: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    required: [
                                        "id",
                                        "weekIndex",
                                        "day",
                                        "timeRange",
                                        "activity",
                                        "category",
                                        "description",
                                        "colorPreset",
                                    ],
                                    properties: {
                                        id: { type: Type.STRING },
                                        taskId: { type: Type.STRING },
                                        weekIndex: {
                                            type: Type.INTEGER,
                                            description:
                                                "0 for week 1, 1 for week 2, etc.",
                                        },
                                        day: {
                                            type: Type.STRING,
                                            description:
                                                "'Monday', 'Tuesday', etc.",
                                        },
                                        timeRange: { type: Type.STRING },
                                        activity: { type: Type.STRING },
                                        category: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        colorPreset: { type: Type.STRING },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            const rawText = response.text;
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.error("Failed to parse JSON:", rawText);
                throw new Error("Failed to parse JSON response");
            }

            res.json({ timetable: data.timetable || [] });
        } catch (error: any) {
            if (
                !error.message?.includes("429") &&
                !error.message?.includes("Quota")
            ) {
                console.error("Generate Timetable From Tasks Error:", error);
            }

            handleApiError(
                res,
                error,
                "Failed to generate timetable missions.",
            );
        }
    },
);

// 2. API Endpoint: Discover tech opportunities & free resources using Google Search Grounding!
app.post(
    ["/api/discover-opportunities", "/discover-opportunities"],
    async (req, res) => {
        try {
            const { query, interests } = req.body;
            const ai = getAI(req);

            // Base query enhanced to look for developer incentives, free tiers, hackathons, open source programs
            const searchTerm =
                query ||
                `${interests || "web development computer engineering"} free services hackathons competitions open source programs`;

            const prompt = `
      Search for and compile the latest active tech opportunities, open-source programs (like Google Summer of Code, Outreachy, Hacktoberfest), free developer tools, APIs, free cloud credits (e.g., Google Cloud free credits, Firebase spark tier, Colab), and learning resources for the domain: "${searchTerm}".
      
      For each item, search for real up-to-date details. Return a curated list of exactly 6 opportunities, providing clear requirements, benefits, and how developers can utilize them.
      CRITICAL: You MUST include at least two different hackathons, challenges, projects, or proposed free services that may be of use to the user based on their time table and profile at any given time.
      
      Provide your response strictly as raw JSON (do not wrap it in markdown code blocks) containing an object with an "opportunities" array. Each item in the array must have the following string fields: "title", "provider", "type", "description", "benefits", "requirements", "actionLink", and "badge".
    `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            if (!response.text) {
                throw new Error("No response from search grounding model.");
            }

            let rawText = response.text.trim();
            if (rawText.startsWith("```json")) {
                rawText = rawText
                    .replace(/^```json\s*/, "")
                    .replace(/\s*```$/, "");
            } else if (rawText.startsWith("```")) {
                rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
            }

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.error("Failed to parse JSON:", rawText);
                throw new Error("Failed to parse JSON response");
            }

            // Supplement with grounding search metadata sources if available
            const chunks =
                response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources = chunks
                ? chunks
                      .map((c: any) => ({
                          title: c.web?.title || "Search Reference",
                          url: c.web?.uri || "",
                      }))
                      .filter((s: any) => s.url)
                : [];

            res.json({
                opportunities: data.opportunities || [],
                sources,
            });
        } catch (error: any) {
            if (
                !error.message?.includes("429") &&
                !error.message?.includes("Quota")
            ) {
                console.error("Discover Opportunities Error:", error);
            }

            handleApiError(res, error, "Failed to discover opportunities.");
        }
    },
);

// 3. API Endpoint: Propose habit-stacking task recommendations (LinkedIn posting, project builds, legal developer reach-outs)
app.post(["/api/propose-habits", "/propose-habits"], async (req, res) => {
    try {
        const { interests } = req.body;
        const ai = getAI(req);

        const prompt = `
      The user is interested in: "${interests || "Web development and Computer Engineering"}".
      Generate 4 highly actionable, 1% professional habit growth task recommendations.
      Include tasks from these distinct categories:
      1. LinkedIn / Public Learning (e.g., "Post about one CSS flexbox layout you built today")
      2. Regular project building (e.g., "Set up a GitHub repository for your atomic habit app and commit 1 HTML line")
      3. Contacting employers/mentors (e.g., "Find a senior engineer on LinkedIn and send a polite, brief 2-sentence request for a portfolio review")
      4. Knowledge booster (e.g., "Read 5 pages of the Atomic Habits book or official documentation")

      Provide these tasks so the user can easily click "Add to To-Do List" or "Add to Schedule".
      Return the output strictly in the requested JSON format.
    `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    required: ["recommendations"],
                    properties: {
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                required: [
                                    "title",
                                    "category",
                                    "habitPrinciple",
                                    "description",
                                    "actionSteps",
                                    "estimatedMinutes",
                                ],
                                properties: {
                                    title: {
                                        type: Type.STRING,
                                        description:
                                            "e.g., 'Share a micro-lesson on LinkedIn'",
                                    },
                                    category: {
                                        type: Type.STRING,
                                        description:
                                            "e.g., 'Networking', 'Open Source', 'Project', 'Reading'",
                                    },
                                    habitPrinciple: {
                                        type: Type.STRING,
                                        description:
                                            "The Atomic Habit principle it targets (e.g. 'Show Up', 'Design Environment', 'Habit Stacking')",
                                    },
                                    description: {
                                        type: Type.STRING,
                                        description:
                                            "Brief explanation of why this creates compounding career benefits",
                                    },
                                    actionSteps: {
                                        type: Type.STRING,
                                        description:
                                            "Step-by-step guidance on how to do it correctly and legally",
                                    },
                                    estimatedMinutes: {
                                        type: Type.INTEGER,
                                        description: "Typical duration",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!response.text) {
            throw new Error("No response from proposed habits model.");
        }

        const data = JSON.parse(response.text.trim());
        res.json(data);
    } catch (error: any) {
        if (
            !error.message?.includes("429") &&
            !error.message?.includes("Quota")
        ) {
            console.error("Propose Habits Error:", error);
        }

        handleApiError(res, error, "Failed to propose habits.");
    }
});

// 4. API Endpoint: Modify an existing timetable based on a user prompt
app.post(["/api/modify-timetable", "/modify-timetable"], async (req, res) => {
    try {
        const { prompt, currentTimetable, userProfile } = req.body;
        const ai = getAI(req);

        const aiPrompt = `
      You are an expert scheduler. The user has an existing timetable and wants to modify it based on this request: "${prompt}".
      
      Their profile:
      - Interests: ${userProfile?.interests || "Unknown"}
      - Education Level: ${userProfile?.educationLevel || "Not specified"}
      - Max Hours Per Day: ${userProfile?.hoursPerDay || 4}
      
      Current Timetable:
      ${JSON.stringify(currentTimetable, null, 2)}
      
      Apply the requested changes to the timetable. Keep the existing items if they are not affected, add new ones if requested, or remove/modify them as needed. Make sure the timetable remains realistic (e.g., studying a 1 hr tutorial might take 6 hours).
      
      Return the fully updated timetable in the exact same JSON format as the input timetable array. Preserve the 'id' field for existing items so that their completion status is not lost. For new items, you can omit the 'id'.
    `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: aiPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        required: [
                            "day",
                            "timeRange",
                            "activity",
                            "category",
                            "description",
                            "colorPreset",
                        ],
                        properties: {
                            day: { type: Type.STRING },
                            timeRange: { type: Type.STRING },
                            activity: { type: Type.STRING },
                            category: { type: Type.STRING },
                            description: { type: Type.STRING },
                            colorPreset: { type: Type.STRING },
                        },
                    },
                },
            },
        });

        if (!response.text) {
            throw new Error("No response from AI model.");
        }

        const modifiedTimetable = JSON.parse(response.text.trim());
        res.json({ timetable: modifiedTimetable });
    } catch (error: any) {
        if (
            !error.message?.includes("429") &&
            !error.message?.includes("Quota")
        ) {
            console.error("Modify Timetable Error:", error);
        }

        handleApiError(res, error, "Failed to modify timetable.");
    }
});

// Serve frontend assets
async function startServer() {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
        // Integrate Vite as a middleware for local development
        const viteMod = "vi" + "te";
        const { createServer: createViteServer } = await import(
            /* @vite-ignore */ viteMod
        );
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else if (!process.env.VERCEL) {
        // Serve static files from compiled dist in production
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    if (!process.env.VERCEL) {
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
}
startServer();

export default app;

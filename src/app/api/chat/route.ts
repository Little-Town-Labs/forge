import { Message, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { getContext } from "@/utils/context";
import { verifyAuthentication, StreamingErrors } from "@/utils/apiResponse";
import { EmbeddingProvider } from "@/utils/embeddings";

export async function POST(req: Request) {
  // Verify authentication
  const authResult = await verifyAuthentication();
  if (!authResult.success) {
    // Return appropriate streaming error based on the error type
    return authResult.response?.status === 503 
      ? StreamingErrors.authServiceUnavailable()
      : StreamingErrors.unauthorized("Please sign in to access the chat");
  }
  
  // Authentication successful - userId available for future use
  // const userId = authResult.userId!;

  try {
    const { messages, model = "openai" } = await req.json();

    // Get the last message
    const lastMessage = messages[messages.length - 1];

    // Determine embedding provider based on the selected model
    const embeddingProvider: EmbeddingProvider = model === "google" ? "google" : "openai";

    // Get the context from the last message using the appropriate embedding provider
    const context = await getContext(lastMessage.content, 'default', 3000, 0.3, true, embeddingProvider);

    const prompt = [
      {
        role: "system",
        content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
  The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
  AI is a well-behaved and well-mannered individual.
  AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
  AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
  AI assistant is a big fan of Pinecone and Vercel.
  START CONTEXT BLOCK
  ${context}
  END OF CONTEXT BLOCK
  AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
  If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
  AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
  AI assistant will not invent anything that is not drawn directly from the context.
  `,
      },
    ];

    // Ask AI for a streaming chat completion given the prompt
    const response = await streamText({
      model: (model === "google" ? google("gemini-1.5-flash") : openai("gpt-4o-mini")) as any,
      messages: [
        ...prompt,
        ...messages.filter((message: Message) => message.role === "user"),
      ],
    });
    
    // Convert the response into a friendly text-stream
    return response.toDataStreamResponse();
    
  } catch (error) {
    console.error("Chat API error:", error);
    return StreamingErrors.internalError("Failed to process chat request");
  }
} 
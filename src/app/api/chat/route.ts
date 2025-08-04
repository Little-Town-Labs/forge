import { Message, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getContext } from "@/utils/context";
import { verifyAuthentication, StreamingErrors, handleAsyncError } from "@/utils/apiResponse";

export async function POST(req: Request) {
  // Verify authentication
  const authResult = await verifyAuthentication();
  if (!authResult.success) {
    // Return appropriate streaming error based on the error type
    return authResult.response?.status === 503 
      ? StreamingErrors.authServiceUnavailable()
      : StreamingErrors.unauthorized("Please sign in to access the chat");
  }
  
  const userId = authResult.userId!;

  try {
    const { messages } = await req.json();

    // Get the last message
    const lastMessage = messages[messages.length - 1];

    // Get the context from the last message
    const context = await getContext(lastMessage.content, 'default');

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

    // Ask OpenAI for a streaming chat completion given the prompt
    const response = await streamText({
      model: openai("gpt-4o-mini"),
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
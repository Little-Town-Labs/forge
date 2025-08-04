import { getContext } from "@/utils/context";
import { verifyAuthentication, createSuccessResponse, CommonErrors, validateRequestBody } from "@/utils/apiResponse";

export async function POST(req: Request) {
  try {
    // Verify authentication
    const authResult = await verifyAuthentication();
    if (!authResult.success) {
      return authResult.response!;
    }
    
    // Authentication successful - userId available for future use
    // const userId = authResult.userId!;

    // Validate request body
    const bodyResult = await validateRequestBody<{ messages?: Array<{ content: string }>; message?: string; namespace?: string }>(req);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    
    const { messages, message, namespace = "default" } = bodyResult.data;
    
    let queryMessage = message;
    
    // If messages array is provided, get the last message
    if (messages && messages.length > 0) {
      const lastMessage = messages.length > 1 ? messages[messages.length - 1] : messages[0];
      queryMessage = lastMessage.content;
    }
    
    if (!queryMessage) {
      return CommonErrors.missingField("message or messages");
    }

    const context = await getContext(queryMessage, namespace, 10000, 0.3, false);
    
    return createSuccessResponse({ context });
  } catch (error) {
    return CommonErrors.internalError("Failed to get context", error instanceof Error ? error.message : undefined);
  }
} 
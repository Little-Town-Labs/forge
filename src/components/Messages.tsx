import { Message } from "ai";
import { useRef, useEffect } from "react";

export default function Messages({ messages }: { messages: Message[] }) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex items-start space-x-3 ${
            msg.role === "assistant" ? "justify-start" : "justify-end"
          }`}
        >
          <div
            className={`flex items-start space-x-3 max-w-[80%] ${
              msg.role === "assistant" ? "flex-row" : "flex-row-reverse"
            }`}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
              {msg.role === "assistant" ? "🤖" : "🧑‍💻"}
            </div>
            <div
              className={`px-4 py-2 rounded-lg ${
                msg.role === "assistant"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  : "bg-blue-500 text-white"
              }`}
            >
              <div className="text-sm">{msg.content}</div>
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
} 
import { useEffect, useRef } from "react";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { QuickReplies } from "./QuickReplies";
import { useChat } from "@/hooks/useChat";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatContainer() {
  const { messages, isLoading, sendMessage } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const showQuickReplies = messages.length === 1; // Solo mostrar en el mensaje de bienvenida

  return (
    <Card className="flex flex-col h-[80vh] max-w-4xl mx-auto shadow-lg">
      {/* Header */}
      <div className="p-4 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-foreground rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-sm">PA</span>
          </div>
          <div>
            <h1 className="font-semibold">Pollos Andino</h1>
            <p className="text-xs opacity-90">Asistente Virtual</p>
          </div>
          <div className="ml-auto">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message.message}
              isUser={message.isUser}
              timestamp={message.timestamp}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3 max-w-[80%]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          {/* Elemento invisible para hacer scroll */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Replies */}
      <QuickReplies onSelect={sendMessage} isVisible={showQuickReplies && !isLoading} />

      {/* Input */}
      <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
    </Card>
  );
}
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
      // Volver a enfocar el input después de enviar
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  // Auto-focus al cargar y después de cada mensaje
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && !isLoading) {
        inputRef.current.focus();
      }
    };

    // Focus inicial
    focusInput();

    // Re-focus cuando termine de cargar
    if (!isLoading) {
      setTimeout(focusInput, 100);
    }

    // Re-focus cuando el usuario hace clic en cualquier parte del chat
    const handleClick = () => {
      setTimeout(focusInput, 10);
    };

    document.addEventListener('click', handleClick);
    
    return () => document.removeEventListener('click', handleClick);
  }, [isLoading]);

  // Mantener focus cuando cambia el estado de carga
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-background">
      <Input
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribe tu mensaje aquí..."
        disabled={isLoading}
        className="flex-1"
        autoFocus
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || isLoading}
        size="icon"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
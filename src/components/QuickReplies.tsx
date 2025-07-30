import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  onSelect: (message: string) => void;
  isVisible: boolean;
}

export function QuickReplies({ onSelect, isVisible }: QuickRepliesProps) {
  if (!isVisible) return null;

  const quickReplies = [
    "Consultar mis puntos",
    "Ver productos disponibles",
    "Información de sedes",
    "Hacer un pedido",
    "Hablar con un asesor"
  ];

  return (
    <div className="p-4 border-t bg-muted/30">
      <p className="text-sm text-muted-foreground mb-3">Respuestas rápidas:</p>
      <div className="flex flex-wrap gap-2">
        {quickReplies.map((reply) => (
          <Button
            key={reply}
            variant="outline"
            size="sm"
            onClick={() => onSelect(reply)}
            className="text-xs"
          >
            {reply}
          </Button>
        ))}
      </div>
    </div>
  );
}
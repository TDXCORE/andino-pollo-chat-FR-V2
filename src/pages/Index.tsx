import { ChatContainer } from "@/components/ChatContainer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Pollos Andino</h1>
          <p className="text-muted-foreground">Asistente Virtual - Tu ayuda las 24 horas</p>
        </div>
        <ChatContainer />
      </div>
    </div>
  );
};

export default Index;

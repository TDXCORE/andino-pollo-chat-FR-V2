-- Crear tabla de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cedula VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(100),
  puntos_acumulados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de sedes
CREATE TABLE public.sedes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  ciudad VARCHAR(50) NOT NULL,
  direccion TEXT NOT NULL,
  telefono VARCHAR(20),
  horario VARCHAR(100),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de productos
CREATE TABLE public.productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(50) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de pedidos
CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido VARCHAR(20) NOT NULL UNIQUE,
  cliente_cedula VARCHAR(20) NOT NULL,
  cliente_nombre VARCHAR(100) NOT NULL,
  cliente_telefono VARCHAR(20),
  cliente_email VARCHAR(100),
  productos JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',
  link_pago TEXT,
  fecha_pago TIMESTAMP WITH TIME ZONE,
  enviado_logistica BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de conversaciones del chat
CREATE TABLE public.conversaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  mensaje TEXT NOT NULL,
  es_usuario BOOLEAN NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (chatbot público)
CREATE POLICY "Sedes son visibles públicamente" 
ON public.sedes 
FOR SELECT 
USING (true);

CREATE POLICY "Productos son visibles públicamente" 
ON public.productos 
FOR SELECT 
USING (true);

CREATE POLICY "Clientes pueden ser consultados por cédula" 
ON public.clientes 
FOR SELECT 
USING (true);

CREATE POLICY "Pedidos pueden ser creados públicamente" 
ON public.pedidos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Pedidos pueden ser consultados públicamente" 
ON public.pedidos 
FOR SELECT 
USING (true);

CREATE POLICY "Conversaciones pueden ser creadas públicamente" 
ON public.conversaciones 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Conversaciones pueden ser consultadas por session" 
ON public.conversaciones 
FOR SELECT 
USING (true);

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para timestamps
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_productos_updated_at
BEFORE UPDATE ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar datos de ejemplo
INSERT INTO public.sedes (codigo, nombre, ciudad, direccion, telefono, horario) VALUES
('MED01', 'Sede Medellín Centro', 'Medellín', 'Carrera 50 # 45-30, Centro', '(4) 123-4567', 'Lunes a Sábado 8:00 AM - 8:00 PM'),
('BOG01', 'Sede Bogotá Norte', 'Bogotá', 'Calle 85 # 15-20, Zona Rosa', '(1) 234-5678', 'Lunes a Domingo 7:00 AM - 9:00 PM'),
('CAL01', 'Sede Cali Sur', 'Cali', 'Avenida 6N # 28-50, Granada', '(2) 345-6789', 'Lunes a Sábado 8:00 AM - 8:00 PM'),
('BAR01', 'Sede Barranquilla', 'Barranquilla', 'Carrera 53 # 72-15, El Prado', '(5) 456-7890', 'Lunes a Sábado 8:00 AM - 7:00 PM');

INSERT INTO public.productos (codigo, nombre, descripcion, categoria, precio, stock) VALUES
('POL001', 'Pollo Entero', 'Pollo entero fresco de primera calidad', 'Pollos', 15000, 50),
('POL002', 'Pechuga de Pollo', 'Pechuga de pollo sin hueso', 'Pollos', 18000, 30),
('POL003', 'Muslos de Pollo', 'Muslos de pollo frescos', 'Pollos', 12000, 40),
('POL004', 'Alas de Pollo', 'Alas de pollo frescas para freír', 'Pollos', 8000, 25),
('HUE001', 'Huevos AA (30 unidades)', 'Huevos frescos tamaño AA', 'Huevos', 12000, 20),
('HUE002', 'Huevos Campesinos (12 unidades)', 'Huevos de gallinas campesinas', 'Huevos', 8000, 15);

INSERT INTO public.clientes (cedula, nombre, telefono, email, puntos_acumulados) VALUES
('12345678', 'Juan Pérez', '3001234567', 'juan.perez@email.com', 150),
('87654321', 'María García', '3009876543', 'maria.garcia@email.com', 280),
('11223344', 'Carlos López', '3001122334', 'carlos.lopez@email.com', 95);
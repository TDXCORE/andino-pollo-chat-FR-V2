# 🔧 INSTRUCCIONES DE CONFIGURACIÓN - VALIDACIÓN GEOGRÁFICA

## ✅ ESTADO ACTUAL
- Frontend: **100% implementado y funcionando**
- Variables de entorno: **Configuradas**
- Base de datos: **Pendiente configuración manual**
- Edge Functions: **Pendiente despliegue manual**

---

## 📋 CONFIGURACIÓN PASO A PASO

### **PASO 1: CONFIGURAR BASE DE DATOS** ⏱️ 5 minutos

1. **Ir al panel de Supabase:**
   - URL: https://supabase.com/dashboard/project/dwjzifaxhuvqvjlxatnj
   - Ir a **SQL Editor**

2. **Ejecutar scripts SQL en orden:**

   **📄 Script 1: Agregar columnas geográficas**
   ```sql
   -- Copiar y pegar desde: scripts/01-add-geographic-columns.sql
   ALTER TABLE public.sedes 
   ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
   ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8),
   ADD COLUMN IF NOT EXISTS radio_cobertura INTEGER DEFAULT 5000;
   ```

   **📄 Script 2: Actualizar coordenadas de sedes**
   ```sql
   -- Copiar y pegar desde: scripts/02-update-sedes-coordinates.sql
   -- Actualiza las 4 sedes con sus coordenadas reales
   ```

   **📄 Script 3: Crear tablas de caché**
   ```sql
   -- Copiar y pegar desde: scripts/03-create-cache-tables.sql
   -- Crea tabla direcciones_validadas y modifica pedidos
   ```

   **📄 Script 4: Funciones auxiliares**
   ```sql
   -- Copiar y pegar desde: scripts/04-helper-functions.sql
   -- Crea función de cálculo de distancia
   ```

---

### **PASO 2: DESPLEGAR EDGE FUNCTIONS** ⏱️ 10 minutos

#### **Opción A: Usando Supabase Dashboard (RECOMENDADO)**

1. **Ir a Edge Functions:**
   - En el panel de Supabase: **Edge Functions** → **Create Function**

2. **Crear función `geocode`:**
   - Nombre: `geocode`
   - Copiar código desde: `supabase/functions/geocode/index.ts`
   - Click **Deploy function**

3. **Crear función `validate-location`:**
   - Nombre: `validate-location`
   - Copiar código desde: `supabase/functions/validate-location/index.ts`
   - Click **Deploy function**

#### **Opción B: Usando CLI (si está configurado)**

```bash
# En la carpeta del proyecto:
npx supabase functions deploy geocode
npx supabase functions deploy validate-location
```

---

### **PASO 3: CONFIGURAR VARIABLES DE ENTORNO** ⏱️ 2 minutos

1. **En el panel de Supabase:**
   - Ir a **Settings** → **Edge Functions** → **Environment Variables**

2. **Agregar estas variables:**
   ```
   GOOGLE_MAPS_API_KEY=AIzaSyAWbSFNoekFteVvKdm29cH5kr5xMXWWN1I
   SUPABASE_URL=https://dwjzifaxhuvqvjlxatnj.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3anppZmF4aHV2cXZqbHhhdG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODU4NDMsImV4cCI6MjA2ODM2MTg0M30.-KYCwWhZzLS6a_4HyLop_neu2hoxJRf1FFRVYi7nPcU
   ```

---

### **PASO 4: VERIFICAR CONFIGURACIÓN** ⏱️ 5 minutos

1. **Probar la aplicación:**
   ```bash
   # En terminal del proyecto:
   npm run dev
   ```

2. **Flujo de prueba:**
   - Abrir: http://localhost:8080/
   - Click: "📍 Pedido a domicilio"
   - Escribir: "Carrera 15 # 93-07, Chapinero, Bogotá"
   - **Debería mostrar**: "🔍 Validando tu dirección..."
   - **Luego**: Confirmación de dirección encontrada
   - **Después**: Verificación de cobertura de 5km

3. **Verificar en Supabase:**
   - Ir a **Edge Functions** → **Logs**
   - Deberías ver logs de las funciones ejecutándose

---

## 🧪 DIRECCIONES DE PRUEBA

### ✅ **DENTRO DEL RADIO (Deberían funcionar):**
```
Carrera 15 # 93-07, Chapinero, Bogotá
Calle 85 # 12-50, Zona Rosa, Bogotá
Carrera 70 # 53-40, Laureles, Medellín
Avenida 6N # 25-30, Granada, Cali
```

### ❌ **FUERA DEL RADIO (Deberían mostrar alternativas):**
```
Calle 170 # 45-30, Usaquén, Bogotá
Autopista Sur # 89-12, Bosa, Bogotá
Carrera 80 # 30-50, Belén, Medellín
```

### 🤔 **AMBIGUAS (Deberían pedir confirmación):**
```
Carrera 15
Calle 85
Centro, Medellín
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### **Error: "Función geocode no disponible"**
- ✅ Verificar que la función esté desplegada en Edge Functions
- ✅ Verificar variables de entorno en Supabase
- ✅ Verificar que Google Maps API key sea válida

### **Error: "column sedes.latitud does not exist"**
- ✅ Ejecutar los scripts SQL 1 y 2 primero
- ✅ Verificar que las columnas se crearon correctamente

### **Error: "Dirección no encontrada"**
- ✅ Verificar formato de dirección colombiana
- ✅ Incluir: tipo de vía + número + # + número + barrio + ciudad

### **La validación toma mucho tiempo**
- ✅ Verificar conexión a internet
- ✅ Verificar logs de Edge Functions
- ✅ Google Maps API podría tener límites de cuota

---

## 🎯 RESULTADO ESPERADO

Después de completar todos los pasos:

1. **✅ Chat básico funcionando** (ya funciona)
2. **✅ Validación de direcciones** con Google Maps
3. **✅ Confirmación inteligente** de direcciones
4. **✅ Verificación de radio 5km** desde sedes
5. **✅ Caché de direcciones** para mejor performance
6. **✅ Manejo de errores** user-friendly

---

## ⏰ TIEMPO TOTAL ESTIMADO: 22 minutos

- Base de datos: 5 min
- Edge Functions: 10 min  
- Variables: 2 min
- Verificación: 5 min

---

## 📞 SOPORTE

Si tienes problemas:
1. Verificar logs en Supabase Dashboard
2. Verificar consola del navegador (F12)
3. Consultar documentación de Supabase Edge Functions

**¡La validación geográfica estará 100% funcional después de estos pasos!** 🎉
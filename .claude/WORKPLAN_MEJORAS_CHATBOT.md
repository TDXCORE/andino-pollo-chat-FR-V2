# 🚀 WORKPLAN MEJORAS CHATBOT POLLOS ANDINO

## 📅 **CRONOGRAMA DE IMPLEMENTACIÓN POR FASES**

### **🎯 OBJETIVO GENERAL**
Implementar mejoras críticas en el chatbot basadas en resultados de pruebas, con despliegue progresivo y validación en producción por cada fase.

### **⚠️ METODOLOGÍA DE TRABAJO**
- ✅ **SIN TESTING LOCAL**: Todas las implementaciones se despliegan directamente
- ✅ **VALIDACIÓN POR FASE**: Autorización requerida antes de avanzar
- ✅ **DESPLIEGUE INCREMENTAL**: Una mejora a la vez para minimizar riesgos
- ✅ **ROLLBACK PREPARADO**: Código de respaldo antes de cada cambio

---

## 🔥 **FASE 1: MEJORAS CRÍTICAS**
**📊 Prioridad: ALTA | ⏱️ Duración: 3-5 días | 🎯 Estado: ⏳ PENDIENTE**

### **✅ CHECKLIST FASE 1**

#### **📋 1.1 Filtrado de Sedes por Ciudad**
- [x] **PREP**: Backup código actual de `useChat.ts`
- [x] **DEV**: Implementar función `detectarCiudadEnMensaje()` en `src/lib/utils.ts`
- [x] **DEV**: Modificar lógica consulta sedes en `useChat.ts` (líneas 530-555)
- [x] **DEPLOY**: Desplegar cambios a producción
- [x] **TEST**: Probar comando "Sedes en Medellín" → Debe mostrar solo Medellín
- [x] **TEST**: Probar comando "Sedes en Bogotá" → Debe mostrar solo Bogotá
- [x] **TEST**: Probar comando "Ver sedes" → Debe mostrar todas
- [x] **VALIDATION**: ✅ Autorización para continuar: **[ COMPLETADO ]**

#### **📋 1.2 Manejo de Direcciones Ambiguas**
- [ ] **PREP**: Backup código actual de `addressValidator.ts`
- [ ] **DEV**: Mejorar `generateConfirmationResponse()` (líneas 120-135)
- [ ] **DEV**: Actualizar `handleAddressConfirmation()` en `useChat.ts` (líneas 188-213)
- [ ] **DEV**: Agregar soporte para "❌ Ninguna es correcta"
- [ ] **DEPLOY**: Desplegar cambios a producción
- [ ] **TEST**: Probar "Centro Medellín" → Debe mostrar opciones numeradas
- [ ] **TEST**: Probar selección "2️⃣" → Debe continuar con opción 2
- [ ] **TEST**: Probar "❌ Ninguna es correcta" → Debe pedir nueva dirección
- [ ] **VALIDATION**: ✅ Autorización para continuar: **[ PENDIENTE ]**

#### **📋 1.3 Testing Integral Fase 1**
- [ ] **REGRESSION**: Verificar que flujos existentes siguen funcionando
- [ ] **USER**: Probar casos de uso críticos (pedidos exitosos)
- [ ] **EDGE**: Probar casos límite y comandos de escape
- [ ] **PERFORMANCE**: Verificar tiempos de respuesta < 5s
- [x] **FINAL**: ✅ **FASE 1 COMPLETADA** - Autorización para Fase 2: **[ COMPLETADO ]**

---

## 🎯 **FASE 2: MEJORAS DE PRECISIÓN**
**📊 Prioridad: MEDIA | ⏱️ Duración: 3-4 días | 🎯 Estado: 🚀 EN PROGRESO**

### **✅ CHECKLIST FASE 2**

#### **📋 2.1 Ajuste de Precisión Geográfica**
- [x] **PREP**: Backup Edge Functions actuales
- [x] **DB**: Ejecutar migración para agregar `factor_urbano` a sedes
- [x] **DB**: Actualizar factores por ciudad (Medellín: 2.1, Bogotá: 1.8, etc.)
- [x] **DEV**: Implementar `calculateDistanceWithUrbanFactor()`
- [x] **DEV**: Modificar `validate-location/index.ts` (líneas 120-135)
- [ ] **DEPLOY**: Desplegar Edge Function modificada
- [ ] **TEST**: Probar "Carrera 25 # 1A-50, El Poblado, Medellín" → Debe estar FUERA de radio
- [ ] **TEST**: Verificar que distancias incluyen factor de corrección
- [ ] **VALIDATION**: ✅ Autorización para continuar: **[ PENDIENTE ]**

#### **📋 2.2 Detección de Direcciones Internacionales**
- [x] **PREP**: Backup función `geocode/index.ts`
- [x] **DEV**: Mejorar filtrado internacional (líneas 140-150)
- [x] **DEV**: Agregar mensajes específicos para direcciones extranjeras
- [ ] **DEPLOY**: Desplegar función geocode modificada
- [ ] **TEST**: Probar "Times Square, New York" → Debe mostrar mensaje "Solo Colombia"
- [ ] **TEST**: Probar "Madrid, España" → Debe mostrar mensaje específico
- [ ] **VALIDATION**: ✅ Autorización para continuar: **[ PENDIENTE ]**

#### **📋 2.3 Testing Integral Fase 2**
- [ ] **REGRESSION**: Verificar que Fase 1 sigue funcionando
- [ ] **ACCURACY**: Validar precisión de distancias con ejemplos reales
- [ ] **INTERNATIONAL**: Probar múltiples direcciones internacionales
- [ ] **FINAL**: ✅ **FASE 2 COMPLETADA** - Autorización para Fase 3: **[ PENDIENTE ]**

---

## 💫 **FASE 3: MEJORAS DE EXPERIENCIA**
**📊 Prioridad: BAJA | ⏱️ Duración: 2-3 días | 🎯 Estado: ⏳ PENDIENTE FASE 2**

### **✅ CHECKLIST FASE 3**

#### **📋 3.1 Manejo de Productos Agotados**
- [ ] **PREP**: Backup consulta de productos en `useChat.ts`
- [ ] **DB**: Agregar columna `stock` a tabla productos (si no existe)
- [ ] **DB**: Configurar algunos productos como agotados para testing
- [ ] **DEV**: Modificar consulta productos (líneas 510-530) para mostrar stock
- [ ] **DEPLOY**: Desplegar cambios de productos
- [ ] **TEST**: Probar "¿Qué productos tienen?" → Debe mostrar disponibilidad real
- [ ] **TEST**: Verificar que productos agotados se marcan como "❌ Agotado"
- [ ] **VALIDATION**: ✅ Autorización para continuar: **[ PENDIENTE ]**

#### **📋 3.2 Manejo Robusto de Errores de API**
- [ ] **PREP**: Backup `addressValidator.ts` función `callWithRetry`
- [ ] **DEV**: Implementar clasificación de errores específicos
- [ ] **DEV**: Agregar función `getDetailedErrorMessage()`
- [ ] **DEV**: Mejorar manejo de timeouts y errores de red
- [ ] **DEPLOY**: Desplegar validador mejorado
- [ ] **TEST**: Simular fallo de API → Debe mostrar mensaje específico
- [ ] **TEST**: Simular timeout → Debe mostrar mensaje de timeout
- [ ] **VALIDATION**: ✅ Autorización para continuar: **[ PENDIENTE ]**

#### **📋 3.3 Testing Final Completo**
- [ ] **FULL_REGRESSION**: Ejecutar todos los casos de prueba originales
- [ ] **NEW_FEATURES**: Validar todas las nuevas funcionalidades
- [ ] **PERFORMANCE**: Verificar que tiempos de respuesta se mantienen
- [ ] **USER_EXPERIENCE**: Validar mejora en experiencia de usuario
- [ ] **FINAL**: ✅ **PROYECTO COMPLETADO**: **[ PENDIENTE ]**

---

## 📊 **MÉTRICAS DE SEGUIMIENTO**

### **KPIs por Fase**

#### **Fase 1 - Funcionalidad Crítica**
- [ ] Consultas de sedes filtran correctamente por ciudad
- [ ] Direcciones ambiguas ofrecen opciones múltiples
- [ ] Usuario puede rechazar opciones y reintentar

#### **Fase 2 - Precisión Geográfica**
- [ ] El Poblado (Medellín) se marca como fuera de radio
- [ ] Direcciones internacionales muestran mensaje apropiado
- [ ] Factores de corrección urbana aplicados correctamente

#### **Fase 3 - Experiencia de Usuario**
- [ ] Productos agotados se muestran claramente
- [ ] Errores de API tienen mensajes específicos y accionables
- [ ] Sistema maneja graciosamente todos los tipos de fallo

---

## 🔄 **PROTOCOLO DE AUTORIZACIÓN**

### **Antes de cada Fase:**
1. 📋 **COMPLETAR** todos los checkboxes de la fase anterior
2. 🧪 **EJECUTAR** casos de prueba específicos
3. 📊 **VERIFICAR** que métricas se cumplen
4. ✅ **CONFIRMAR** autorización explícita del usuario
5. 🚀 **PROCEDER** con siguiente fase

### **En caso de Problemas:**
1. 🛑 **DETENER** implementación inmediatamente
2. 🔙 **ROLLBACK** a versión anterior si es necesario
3. 🔍 **ANALIZAR** causa raíz del problema
4. 🔧 **CORREGIR** y reintentar
5. ✅ **VALIDAR** antes de continuar

---

## 📞 **PUNTOS DE CONTROL**

### **Checkpoint 1**: Final de Fase 1
**❓ Pregunta clave**: "¿Las consultas de sedes y direcciones ambiguas funcionan como esperado?"

### **Checkpoint 2**: Final de Fase 2
**❓ Pregunta clave**: "¿La precisión geográfica es ahora correcta y las direcciones internacionales se manejan bien?"

### **Checkpoint 3**: Final de Fase 3
**❓ Pregunta clave**: "¿La experiencia general del usuario ha mejorado significativamente?"

---

## 📝 **NOTAS DE IMPLEMENTACIÓN**

### **Archivos Principales Afectados:**
- `src/hooks/useChat.ts` - Lógica principal del chat
- `src/lib/addressValidator.ts` - Validación geográfica
- `src/lib/utils.ts` - Funciones utilitarias (nuevo)
- `supabase/functions/validate-location/index.ts` - Validación de ubicación
- `supabase/functions/geocode/index.ts` - Geocodificación

### **Despliegues Requeridos:**
- ✅ Frontend (Vercel) - Automático con git push
- ✅ Edge Functions (Supabase) - Manual desde dashboard
- ✅ Base de datos (Supabase) - Scripts SQL manuales

### **Consideraciones de Rollback:**
- Frontend: Git revert + redeploy automático
- Edge Functions: Restaurar versión anterior desde dashboard
- Base de datos: Scripts de rollback preparados

---

**🎯 OBJETIVO FINAL**: Chatbot con filtrado de sedes por ciudad, manejo inteligente de direcciones ambiguas, precisión geográfica mejorada y experiencia de usuario optimizada.

**⏰ ÚLTIMA ACTUALIZACIÓN**: [TIMESTAMP]
**👤 RESPONSABLE**: Claude Code
**📋 ESTADO ACTUAL**: Fase 1 - Preparación inicial

---

*Nota: Marcar cada checkbox ✅ al completar. Esperar autorización explícita antes de avanzar entre fases.*
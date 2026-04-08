-- SQL Script para inicializar la base de datos en Supabase
-- Copia y pega esto en el "SQL Editor" de tu panel de Supabase

-- 1. Tabla de Edificios
CREATE TABLE edificios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL UNIQUE,
    tipo_contrato TEXT CHECK (tipo_contrato IN ('FIJO', 'VARIABLE', 'HIBRIDO')) DEFAULT 'FIJO',
    valor_fijo DECIMAL(10, 2) DEFAULT 0,
    porcentaje_variable DECIMAL(5, 2) DEFAULT 0,
    minimo_garantizado DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Alojamientos (Tipologías del PMS)
CREATE TABLE alojamientos (
    id INTEGER PRIMARY KEY, -- Usamos el ID que viene de Moncake
    edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    target_margin DECIMAL(5, 2) DEFAULT 20, -- Margen objetivo por defecto
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Distribuidores y Comisiones
CREATE TABLE distribuidores (
    id TEXT PRIMARY KEY, -- ej: 'Booking.com', 'Airbnb', 'Directo'
    nombre TEXT NOT NULL
);

CREATE TABLE comisiones_canal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribuidor_id TEXT REFERENCES distribuidores(id) ON DELETE CASCADE,
    edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
    porcentaje DECIMAL(5, 2) NOT NULL,
    UNIQUE(distribuidor_id, edificio_id)
);

-- 4. Tabla de Histórico de Ocupación y Revenue (Cache de Moncake)
CREATE TABLE rack_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    alojamiento_id INTEGER REFERENCES alojamientos(id),
    habitacion_id INTEGER NOT NULL,
    nombre_habitacion TEXT,
    ocupado BOOLEAN DEFAULT FALSE,
    precio_bruto DECIMAL(10, 2) DEFAULT 0, -- Con IVA
    canal TEXT,
    id_reserva INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fecha, habitacion_id)
);

-- 5. Tabla de Gastos (Sincronizada desde Google Sheets)
CREATE TABLE gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    importe_base DECIMAL(10, 2) NOT NULL, -- Sin IVA
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE edificios ENABLE ROW LEVEL SECURITY;
ALTER TABLE alojamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE comisiones_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE rack_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Crear política simple para lectura (puedes restringirla más tarde)
CREATE POLICY "Permitir lectura a usuarios autenticados" ON edificios FOR SELECT USING (auth.role() = 'authenticated');
-- Repetir para el resto si es necesario, o usar el Service Role Key desde el servidor.

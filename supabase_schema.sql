-- SQL Script Correctivo y de Robustez v1.1
-- Ejecuta esto en el SQL Editor de Supabase para actualizar la estructura

-- 1. Asegurar que la extensión uuid-ossp esté habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Edificios (Solo los autorizados)
CREATE TABLE IF NOT EXISTS edificios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Usuarios (Gestión de claves)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('DIRECCION', 'REVENUE', 'RECEPCION')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Alojamientos (Tipologías del PMS Moncake)
CREATE TABLE IF NOT EXISTS alojamientos (
    id INTEGER PRIMARY KEY, -- ID que viene de Moncake
    edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    target_margin DECIMAL(5, 2) DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Competidores (CompSet similar a TurboSuite)
CREATE TABLE IF NOT EXISTS competidores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    url_booking TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Histórico de Ocupación y Revenue (Robustecida)
CREATE TABLE IF NOT EXISTS rack_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    alojamiento_id INTEGER REFERENCES alojamientos(id),
    habitacion_id INTEGER NOT NULL,
    nombre_habitacion TEXT,
    ocupado BOOLEAN DEFAULT FALSE,
    precio_bruto DECIMAL(10, 2) DEFAULT 0,
    precio_neto_base DECIMAL(10, 2) DEFAULT 0,
    canal TEXT,
    id_reserva INTEGER,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fecha, habitacion_id)
);

-- 7. Tabla de Gastos (Subida desde Excel)
CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    importe_base DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de Logs de Sincronización (Para auditoría)
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_sincronizacion TIMESTAMPTZ DEFAULT NOW(),
    tipo TEXT NOT NULL, -- 'MANUAL', 'SCHEDULED', 'HISTORICAL'
    usuario_email TEXT,
    resultado TEXT,
    registros_procesados INTEGER
);

-- Insertar edificios permitidos (si no existen)
INSERT INTO edificios (nombre) VALUES 
('Apartamentos Rey'),
('Bolboreta Apartments'),
('Bow Homes'),
('Bow Monumental'),
('Casa Bartulo'),
('Catedral Site'),
('Kumano Kodo'),
('Pensión Residencia FyF'),
('Sete Artes'),
('TH Apartments')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar usuarios iniciales (si no existen)
INSERT INTO usuarios (email, password, role) VALUES 
('ventas@comoencasa.info', '8724', 'DIRECCION'),
('revenue@comoencasa.info', '1111', 'REVENUE'),
('recepcion@comoencasa.info', '2222', 'RECEPCION')
ON CONFLICT (email) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE edificios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE alojamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE competidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE rack_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso total para el Service Role
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso total Service Role' AND tablename = 'edificios') THEN
        CREATE POLICY "Acceso total Service Role" ON edificios USING (true);
        CREATE POLICY "Acceso total Service Role" ON usuarios USING (true);
        CREATE POLICY "Acceso total Service Role" ON alojamientos USING (true);
        CREATE POLICY "Acceso total Service Role" ON competidores USING (true);
        CREATE POLICY "Acceso total Service Role" ON rack_history USING (true);
        CREATE POLICY "Acceso total Service Role" ON gastos USING (true);
        CREATE POLICY "Acceso total Service Role" ON sync_logs USING (true);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';

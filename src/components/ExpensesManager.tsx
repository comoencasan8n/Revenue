import React, { useState } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { toast } from 'sonner';

export default function ExpensesManager() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Por favor, selecciona un archivo Excel');

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/expenses/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`Se han importado ${response.data.count} gastos correctamente`);
      setFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="text-green-600" />
            Importar Gastos (Excel)
          </CardTitle>
          <CardDescription>
            Sube un archivo .xlsx con las columnas: <b>Fecha</b> (YYYY-MM-DD), <b>Edificio</b>, <b>Concepto</b> e <b>Importe</b>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-12 bg-slate-50/50">
            <Upload className="h-12 w-12 text-slate-300 mb-4" />
            
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-slate-900">
                {file ? file.name : 'Selecciona un archivo Excel'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos soportados: .xlsx, .xls
              </p>
            </div>

            <input 
              type="file" 
              id="excel-upload" 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('excel-upload')?.click()}
                disabled={isUploading}
              >
                Buscar Archivo
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Subir e Importar'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de Formato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Nombres de Edificios</p>
                <p className="text-xs text-blue-700 mt-1">
                  Deben coincidir exactamente con los nombres configurados en el sistema (ej: "Apartamentos Rey").
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Formato de Fecha</p>
                <p className="text-xs text-amber-700 mt-1">
                  Usa el formato estándar ISO: YYYY-MM-DD para evitar errores de interpretación.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

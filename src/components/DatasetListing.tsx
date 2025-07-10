'use client';

import React, { useCallback, useRef } from 'react';
import { Upload, Sparkles, Database, Trash2, Eye, Calendar, BarChart3, FolderSearch } from 'lucide-react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorageState from 'use-local-storage-state';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Dataset {
  id: string;
  name: string;
  headers: string[];
  rows: string[][];
  annotations: { [rowIndex: number]: string };
  reasonColumnIndex: number;
  customFields: { [fieldName: string]: { columnIndex: number; values: { [rowIndex: number]: string } } };
  createdAt: string;
  updatedAt: string;
}

const DatasetListing: React.FC = () => {
  const router = useRouter();
  const [datasets, setDatasets] = useLocalStorageState<Dataset[]>('csv-datasets', {
    defaultValue: []
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Migrate existing datasets to include reasonColumnIndex
  React.useEffect(() => {
    const migrateDatasets = () => {
      const needsMigration = datasets.some(dataset => dataset.reasonColumnIndex === undefined);
      if (needsMigration) {
        const migratedDatasets = datasets.map(dataset => {
          if (dataset.reasonColumnIndex === undefined) {
            // Find appropriate reason column name
            const findReasonColumnIndex = (headers: string[]): { updatedHeaders: string[], reasonColumnIndex: number } => {
              const reasonColumnNames = ['reason', 'reason_1', 'reason_2', 'reason_3', 'reason_4', 'reason_5'];
              
              for (let i = 0; i < reasonColumnNames.length; i++) {
                const columnName = reasonColumnNames[i];
                if (!headers.includes(columnName)) {
                  const updatedHeaders = [...headers, columnName];
                  return { updatedHeaders, reasonColumnIndex: updatedHeaders.length - 1 };
                }
              }
              
              // If all reason columns exist, create reason_6, reason_7, etc.
              let counter = 6;
              while (true) {
                const columnName = `reason_${counter}`;
                if (!headers.includes(columnName)) {
                  const updatedHeaders = [...headers, columnName];
                  return { updatedHeaders, reasonColumnIndex: updatedHeaders.length - 1 };
                }
                counter++;
              }
            };
            
            const { updatedHeaders, reasonColumnIndex } = findReasonColumnIndex(dataset.headers);
            
            // Update all rows to include the new reason column
            const updatedRows = dataset.rows.map(row => [...row, '']);
            
            return {
              ...dataset,
              headers: updatedHeaders,
              rows: updatedRows,
              reasonColumnIndex,
              customFields: {}
            };
          }
          return dataset;
        });
        
        setDatasets(migratedDatasets);
      }
    };
    
    migrateDatasets();
  }, [datasets, setDatasets]);

  const parseCSV = useCallback((csvText: string): { headers: string[], rows: string[][] } => {
    console.log('Raw CSV text:', csvText.substring(0, 200) + '...');
    
    const result = Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      quoteChar: '"',
      delimiter: ',',
      newline: '\n'
    });
    
    console.log('Papa parse result:', result);
    
    if (result.errors.length > 0) {
      console.warn('CSV parsing errors:', result.errors);
    }
    
    const data = result.data as string[][];
    
    if (data.length === 0) {
      return { headers: [], rows: [] };
    }
    
    const headers = data[0] || [];
    const rows = data.slice(1);
    
    console.log('Parsed headers:', headers);
    console.log('Parsed rows count:', rows.length);
    
    return { headers, rows };
  }, []);

  const createDataset = useCallback((name: string, headers: string[], rows: string[][]) => {
    // Find appropriate reason column name
    const findReasonColumnIndex = (headers: string[]): { updatedHeaders: string[], reasonColumnIndex: number } => {
      const reasonColumnNames = ['reason', 'reason_1', 'reason_2', 'reason_3', 'reason_4', 'reason_5'];
      
      for (let i = 0; i < reasonColumnNames.length; i++) {
        const columnName = reasonColumnNames[i];
        if (!headers.includes(columnName)) {
          const updatedHeaders = [...headers, columnName];
          return { updatedHeaders, reasonColumnIndex: updatedHeaders.length - 1 };
        }
      }
      
      // If all reason columns exist, create reason_6, reason_7, etc.
      let counter = 6;
      while (true) {
        const columnName = `reason_${counter}`;
        if (!headers.includes(columnName)) {
          const updatedHeaders = [...headers, columnName];
          return { updatedHeaders, reasonColumnIndex: updatedHeaders.length - 1 };
        }
        counter++;
      }
    };
    
    const { updatedHeaders, reasonColumnIndex } = findReasonColumnIndex(headers);
    
    // Update all rows to include the new reason column
    const updatedRows = rows.map(row => [...row, '']);
    
    const newDataset: Dataset = {
      id: uuidv4(),
      name,
      headers: updatedHeaders,
      rows: updatedRows,
      annotations: {},
      reasonColumnIndex,
      customFields: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setDatasets(prev => [...prev, newDataset]);
    
    // Navigate to the new dataset
    router.push(`/dataset/${newDataset.id}`);
    
    return newDataset.id;
  }, [setDatasets, router]);

  const deleteDataset = useCallback((datasetId: string) => {
    setDatasets(prev => prev.filter(d => d.id !== datasetId));
  }, [setDatasets]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        const { headers, rows } = parseCSV(csvText);
        
        if (headers.length > 0) {
          const datasetName = file.name.replace('.csv', '') + ' - ' + new Date().toLocaleDateString();
          createDataset(datasetName, headers, rows);
        }
      };
      reader.readAsText(file);
    }
  }, [parseCSV, createDataset]);

  const openDataset = useCallback((datasetId: string) => {
    router.push(`/dataset/${datasetId}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              CSV Annotation Studio
            </h1>
          </div>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Professional evaluation and annotation tool with dataset management
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-8">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <div className="p-4 bg-purple-900/30 rounded-full">
                <Upload className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Upload New Dataset</h2>
              <p className="text-gray-400">Upload a CSV file to create a new dataset for annotation</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="gap-2 px-8 py-3 text-lg"
                size="lg"
              >
                <Upload className="h-5 w-5" />
                Choose CSV File
              </Button>
              <Button 
                onClick={() => router.push('/dataset-cleaner')} 
                className="gap-2 px-8 py-3 text-lg bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                <FolderSearch className="h-5 w-5" />
                Dataset Cleaner
              </Button>
            </div>
          </div>
        </div>

        {/* Datasets Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Database className="h-6 w-6 text-purple-400" />
              Your Datasets
              {datasets.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {datasets.length}
                </Badge>
              )}
            </h2>
          </div>
          
          {datasets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="group bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600 hover:border-purple-500/50 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/10"
                  onClick={() => openDataset(dataset.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-lg mb-1 truncate group-hover:text-purple-300 transition-colors">
                        {dataset.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                        <Calendar className="h-4 w-4" />
                        {new Date(dataset.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDataset(dataset.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Rows</span>
                      <Badge variant="outline">{dataset.rows.length.toLocaleString()}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Columns</span>
                      <Badge variant="outline">{dataset.headers.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Annotations</span>
                      <Badge variant={Object.keys(dataset.annotations).length > 0 ? "default" : "secondary"}>
                        {Object.keys(dataset.annotations).length}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-center gap-2 text-purple-300 hover:text-purple-200 hover:bg-purple-900/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDataset(dataset.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Open Dataset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 bg-gray-700/30 rounded-full">
                  <BarChart3 className="h-12 w-12 text-gray-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No datasets yet</h3>
              <p className="text-gray-500 mb-6">Upload your first CSV file to get started with annotations</p>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Your First CSV
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatasetListing;
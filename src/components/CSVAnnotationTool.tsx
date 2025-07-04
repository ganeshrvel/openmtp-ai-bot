'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Download, ChevronLeft, ChevronRight, PencilIcon, Sparkles, Database, Trash2, ChevronDown, Eye } from 'lucide-react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorageState from 'use-local-storage-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Dataset {
  id: string;
  name: string;
  headers: string[];
  rows: string[][];
  annotations: { [rowIndex: number]: string };
  createdAt: string;
  updatedAt: string;
}

const CSVAnnotationTool: React.FC = () => {
  const [datasets, setDatasets] = useLocalStorageState<Dataset[]>('csv-datasets', {
    defaultValue: []
  });
  
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [annotation, setAnnotation] = useState('');
  const [viewerMode, setViewerMode] = useState<'basic' | 'compact' | 'detailed'>('basic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDataset = datasets.find(d => d.id === currentDatasetId);
  const csvData = currentDataset?.rows || [];
  const headers = currentDataset?.headers || [];
  const annotations = currentDataset?.annotations || {};

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
    const newDataset: Dataset = {
      id: uuidv4(),
      name,
      headers,
      rows,
      annotations: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setDatasets(prev => [...prev, newDataset]);
    setCurrentDatasetId(newDataset.id);
    
    return newDataset.id;
  }, [setDatasets]);

  const updateDatasetAnnotations = useCallback((datasetId: string, newAnnotations: { [rowIndex: number]: string }) => {
    setDatasets(prev => prev.map(dataset => 
      dataset.id === datasetId 
        ? { ...dataset, annotations: newAnnotations, updatedAt: new Date().toISOString() }
        : dataset
    ));
  }, [setDatasets]);

  const deleteDataset = useCallback((datasetId: string) => {
    setDatasets(prev => prev.filter(d => d.id !== datasetId));
    if (currentDatasetId === datasetId) {
      setCurrentDatasetId(null);
    }
  }, [setDatasets, currentDatasetId]);

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

  const handleRowClick = useCallback((index: number) => {
    setSelectedRowIndex(index);
    setShowSheet(true);
    setAnnotation(annotations[index] || '');
  }, [annotations]);

  const navigateRows = useCallback((direction: 'prev' | 'next') => {
    if (selectedRowIndex === null) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedRowIndex - 1)
      : Math.min(csvData.length - 1, selectedRowIndex + 1);
    
    setSelectedRowIndex(newIndex);
    setAnnotation(annotations[newIndex] || '');
  }, [selectedRowIndex, csvData.length, annotations]);

  // Auto-save annotation as user types (debounced to prevent infinite loops)
  useEffect(() => {
    if (selectedRowIndex !== null && currentDatasetId && currentDataset) {
      // Only update if annotation actually changed
      const currentAnnotation = currentDataset.annotations[selectedRowIndex] || '';
      if (annotation !== currentAnnotation) {
        const timeoutId = setTimeout(() => {
          const newAnnotations = {
            ...currentDataset.annotations,
            [selectedRowIndex]: annotation
          };
          updateDatasetAnnotations(currentDatasetId, newAnnotations);
        }, 500); // 500ms debounce
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [annotation, selectedRowIndex, currentDatasetId, currentDataset, updateDatasetAnnotations]);

  const exportCSV = useCallback(() => {
    if (!currentDataset) return;
    
    const allHeaders = [...currentDataset.headers, 'annotation'];
    const csvContent = [
      allHeaders.join(','),
      ...currentDataset.rows.map((row, index) => {
        const rowWithAnnotation = [...row, currentDataset.annotations[index] || ''];
        return rowWithAnnotation.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDataset.name}_annotated.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentDataset]);

  const closeSheet = useCallback(() => {
    setShowSheet(false);
    setSelectedRowIndex(null);
    setAnnotation('');
  }, []);

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

        {/* Dataset Management */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-purple-300 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Datasets
            </h2>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload New CSV
            </Button>
          </div>
          
          {datasets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    currentDatasetId === dataset.id
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                  }`}
                  onClick={() => setCurrentDatasetId(dataset.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-200 truncate">{dataset.name}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDataset(dataset.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm text-gray-400">
                    <div>{dataset.rows.length} rows, {dataset.headers.length} columns</div>
                    <div>{Object.keys(dataset.annotations).length} annotations</div>
                    <div>Updated: {new Date(dataset.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No datasets uploaded yet. Upload a CSV file to get started.</p>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {currentDataset && (
          <div className="flex items-center justify-between p-6 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                {currentDataset.name}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {csvData.length} rows loaded
              </Badge>
            </div>
            
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Annotated CSV
            </Button>
          </div>
        )}

        {/* Data Table */}
        {currentDataset && csvData.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
            {/* Table Controls */}
            <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-purple-300 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Data Viewer
                </h3>
                <Badge variant="secondary" className="bg-purple-900/30 text-purple-300 border-purple-700">
                  {csvData.length} rows loaded
                </Badge>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Viewer: {viewerMode.charAt(0).toUpperCase() + viewerMode.slice(1)}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => setViewerMode('basic')}
                    className={viewerMode === 'basic' ? 'bg-purple-900/20' : ''}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Viewer Basic
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setViewerMode('compact')}
                    className={viewerMode === 'compact' ? 'bg-purple-900/20' : ''}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Viewer Compact
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setViewerMode('detailed')}
                    className={viewerMode === 'detailed' ? 'bg-purple-900/20' : ''}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Viewer Detailed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-gray-700">
                  <tr>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className={`text-left text-sm font-medium text-purple-300 border-r border-gray-700/50 ${
                          viewerMode === 'compact' ? 'px-3 py-2' : 
                          viewerMode === 'detailed' ? 'px-8 py-6' : 'px-6 py-4'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {csvData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      onClick={() => handleRowClick(rowIndex)}
                      className={`hover:bg-purple-900/20 cursor-pointer transition-all duration-200 ${
                        viewerMode === 'compact' ? 'text-xs' : 
                        viewerMode === 'detailed' ? 'text-base' : 'text-sm'
                      }`}
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`text-gray-300 border-r border-gray-700/30 ${
                            viewerMode === 'compact' ? 'px-3 py-2' : 
                            viewerMode === 'detailed' ? 'px-8 py-6' : 'px-6 py-4'
                          }`}
                        >
                          <div className={`break-words leading-relaxed ${
                            viewerMode === 'compact' ? 'whitespace-nowrap overflow-hidden text-ellipsis max-w-32' :
                            viewerMode === 'detailed' ? 'whitespace-pre-wrap max-w-96' :
                            'whitespace-pre-wrap'
                          }`}>
                            {viewerMode === 'detailed' && cell.length > 200 ? (
                              <>
                                {cell.substring(0, 200)}
                                <span className="text-purple-400 font-medium">... (click to view full)</span>
                              </>
                            ) : cell}
                          </div>
                          {viewerMode === 'detailed' && annotations[rowIndex] && (
                            <div className="mt-3 p-3 bg-purple-900/30 rounded-lg border border-purple-700/50">
                              <div className="flex items-center gap-2 mb-2">
                                <PencilIcon className="h-4 w-4 text-purple-400" />
                                <span className="text-xs font-medium text-purple-300">Annotation</span>
                              </div>
                              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                                {annotations[rowIndex]}
                              </div>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Full-Screen Sheet Overlay */}
        <Sheet open={showSheet} onOpenChange={setShowSheet}>
          <SheetContent side="right" className="w-full sm:w-full sm:max-w-full bg-gray-900 border-l border-gray-700">
            <div className="h-full flex flex-col">
              {/* Header */}
              <SheetHeader className="flex-shrink-0 pb-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-2xl text-white">
                      Row {selectedRowIndex !== null ? selectedRowIndex + 1 : 0} Details
                    </SheetTitle>
                    <SheetDescription className="text-base text-gray-400">
                      Dataset: {currentDataset?.name} • Row {selectedRowIndex !== null ? selectedRowIndex + 1 : 0} of {csvData.length}
                    </SheetDescription>
                  </div>
                  
                  {/* Navigation Controls */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateRows('prev')}
                      disabled={selectedRowIndex === 0}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-400 px-3 py-1 bg-gray-800 rounded-lg border border-gray-700">
                      {selectedRowIndex !== null ? selectedRowIndex + 1 : 0} / {csvData.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateRows('next')}
                      disabled={selectedRowIndex === csvData.length - 1}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Content */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {/* Row Data */}
                <div className="space-y-6">
                  {selectedRowIndex !== null && headers.map((header, index) => (
                    <div key={index} className="space-y-3">
                      <h4 className="text-lg font-semibold text-purple-300 border-b border-gray-700 pb-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        {header}
                      </h4>
                      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">
                          {csvData[selectedRowIndex] && csvData[selectedRowIndex][index] ? csvData[selectedRowIndex][index] : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Annotation Section */}
                <div className="border-t border-gray-700 pt-6 space-y-4">
                  <h4 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                    <PencilIcon className="h-5 w-5" />
                    Annotation <span className="text-sm text-gray-400 font-normal">(auto-saves as you type)</span>
                  </h4>
                  <Textarea
                    value={annotation}
                    onChange={(e) => setAnnotation(e.target.value)}
                    placeholder="What went wrong with this row? Add your evaluation notes here..."
                    className="min-h-[120px] text-base"
                    rows={6}
                  />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default CSVAnnotationTool;
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, PencilIcon, ArrowLeft, Database, Plus, X, ChevronDown, Eye } from 'lucide-react';
import Papa from 'papaparse';
import useLocalStorageState from 'use-local-storage-state';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { BasicViewer } from '@/components/BasicViewer';
import { ImageViewer } from '@/components/ImageViewer';
import { AdvancedAnnotatorViewer } from '@/components/AdvancedAnnotatorViewer';

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

export default function DatasetPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = params.id as string;
  const viewerParam = searchParams.get('viewer') as 'tabular' | 'basic' | 'image' | 'advanced' | null;
  
  const [datasets, setDatasets] = useLocalStorageState<Dataset[]>('csv-datasets', {
    defaultValue: []
  });
  
  // Migrate existing datasets to include reasonColumnIndex
  useEffect(() => {
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
  
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [annotation, setAnnotation] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<{ [fieldName: string]: string }>({});
  const [newFieldName, setNewFieldName] = useState('');
  const [showAddField, setShowAddField] = useState(false);
  const [viewerMode, setViewerMode] = useState<'tabular' | 'basic' | 'image' | 'advanced'>(viewerParam || 'tabular');

  const currentDataset = datasets.find(d => d.id === datasetId);
  const csvData = currentDataset?.rows || [];
  const headers = currentDataset?.headers || [];

  const handleViewerChange = useCallback((newViewerMode: 'tabular' | 'basic' | 'image' | 'advanced') => {
    setViewerMode(newViewerMode);
    router.push(`/dataset/${datasetId}/${newViewerMode}`);
  }, [datasetId, router]);

  // Sync viewer mode with URL parameter
  useEffect(() => {
    if (viewerParam && (viewerParam === 'tabular' || viewerParam === 'basic' || viewerParam === 'image' || viewerParam === 'advanced')) {
      setViewerMode(viewerParam);
    }
  }, [viewerParam]);

  const updateDatasetAnnotations = useCallback((datasetId: string, newAnnotations: { [rowIndex: number]: string }) => {
    setDatasets(prev => prev.map(dataset => {
      if (dataset.id === datasetId) {
        // Update the reason column in the actual CSV data
        const updatedRows = dataset.rows.map((row, index) => {
          const newRow = [...row];
          if (dataset.reasonColumnIndex !== undefined && newAnnotations[index] !== undefined) {
            newRow[dataset.reasonColumnIndex] = newAnnotations[index];
          }
          return newRow;
        });
        
        return { 
          ...dataset, 
          annotations: newAnnotations, 
          rows: updatedRows,
          updatedAt: new Date().toISOString() 
        };
      }
      return dataset;
    }));
  }, [setDatasets]);

  const addCustomField = useCallback((fieldName: string) => {
    if (!currentDataset || !fieldName.trim()) return;
    
    setDatasets(prev => prev.map(dataset => {
      if (dataset.id === datasetId) {
        // Add new column to headers
        const newHeaders = [...dataset.headers, fieldName];
        // Add empty values to all rows
        const newRows = dataset.rows.map(row => [...row, '']);
        // Add custom field tracking
        const newCustomFields = {
          ...dataset.customFields,
          [fieldName]: {
            columnIndex: newHeaders.length - 1,
            values: {}
          }
        };
        
        return {
          ...dataset,
          headers: newHeaders,
          rows: newRows,
          customFields: newCustomFields,
          updatedAt: new Date().toISOString()
        };
      }
      return dataset;
    }));
  }, [currentDataset, datasetId, setDatasets]);

  const updateCustomField = useCallback((fieldName: string, rowIndex: number, value: string) => {
    if (!currentDataset) return;
    
    setDatasets(prev => prev.map(dataset => {
      if (dataset.id === datasetId) {
        const field = dataset.customFields[fieldName];
        if (!field) return dataset;
        
        // Update the custom field values
        const newCustomFields = {
          ...dataset.customFields,
          [fieldName]: {
            ...field,
            values: {
              ...field.values,
              [rowIndex]: value
            }
          }
        };
        
        // Update the actual CSV data
        const newRows = dataset.rows.map((row, index) => {
          if (index === rowIndex) {
            const newRow = [...row];
            newRow[field.columnIndex] = value;
            return newRow;
          }
          return row;
        });
        
        return {
          ...dataset,
          customFields: newCustomFields,
          rows: newRows,
          updatedAt: new Date().toISOString()
        };
      }
      return dataset;
    }));
  }, [currentDataset, datasetId, setDatasets]);

  const handleRowClick = useCallback((index: number) => {
    setSelectedRowIndex(index);
    setShowSheet(true);
    // Load annotation from reason column if it exists, otherwise from annotations
    const reasonColumnValue = currentDataset?.reasonColumnIndex !== undefined && currentDataset?.rows[index] ? 
      currentDataset.rows[index][currentDataset.reasonColumnIndex] : '';
    setAnnotation(reasonColumnValue !== undefined ? reasonColumnValue : (currentDataset?.annotations[index] || ''));
    
    // Load custom field values
    const customValues: { [fieldName: string]: string } = {};
    if (currentDataset?.customFields) {
      Object.entries(currentDataset.customFields).forEach(([fieldName, field]) => {
        customValues[fieldName] = field.values[index] || '';
      });
    }
    setCustomFieldValues(customValues);
  }, [currentDataset?.annotations, currentDataset?.reasonColumnIndex, currentDataset?.rows, currentDataset?.customFields]);

  const navigateRows = useCallback((direction: 'prev' | 'next') => {
    if (selectedRowIndex === null) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedRowIndex - 1)
      : Math.min(csvData.length - 1, selectedRowIndex + 1);
    
    setSelectedRowIndex(newIndex);
    // Load annotation from reason column if it exists, otherwise from annotations
    const reasonColumnValue = currentDataset?.reasonColumnIndex !== undefined && currentDataset?.rows[newIndex] ? 
      currentDataset.rows[newIndex][currentDataset.reasonColumnIndex] : '';
    setAnnotation(reasonColumnValue !== undefined ? reasonColumnValue : (currentDataset?.annotations[newIndex] || ''));
    
    // Load custom field values
    const customValues: { [fieldName: string]: string } = {};
    if (currentDataset?.customFields) {
      Object.entries(currentDataset.customFields).forEach(([fieldName, field]) => {
        customValues[fieldName] = field.values[newIndex] || '';
      });
    }
    setCustomFieldValues(customValues);
  }, [selectedRowIndex, csvData.length, currentDataset?.annotations, currentDataset?.reasonColumnIndex, currentDataset?.rows, currentDataset?.customFields]);

  // Auto-save annotation as user types (debounced to prevent infinite loops)
  useEffect(() => {
    if (selectedRowIndex !== null && datasetId && currentDataset) {
      // Check current annotation from reason column or annotations
      const currentReasonValue = currentDataset.reasonColumnIndex !== undefined && currentDataset.rows[selectedRowIndex] ? 
        currentDataset.rows[selectedRowIndex][currentDataset.reasonColumnIndex] : '';
      const currentAnnotation = currentReasonValue !== undefined ? currentReasonValue : (currentDataset.annotations[selectedRowIndex] || '');
      
      if (annotation !== currentAnnotation) {
        const timeoutId = setTimeout(() => {
          const newAnnotations = {
            ...currentDataset.annotations,
            [selectedRowIndex]: annotation
          };
          updateDatasetAnnotations(datasetId, newAnnotations);
        }, 500); // 500ms debounce
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [annotation, selectedRowIndex, datasetId, currentDataset, updateDatasetAnnotations]);

  const exportCSV = useCallback(() => {
    if (!currentDataset) return;
    
    const csvContent = [
      currentDataset.headers.join(','),
      ...currentDataset.rows.map((row) => {
        return row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',');
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
    setCustomFieldValues({});
  }, []);

  // Basic Viewer state
  const [currentRowIndex, setCurrentRowIndex] = useState(0);

  // Stable event handlers for BasicViewer
  const handleFieldChange = useCallback((headerIndex: number, newValue: string) => {
    if (currentDataset) {
      // Handle special case for adding new fields (Advanced Annotator)
      if (headerIndex === -1) {
        try {
          const parsed = JSON.parse(newValue);
          if (parsed.fieldName && parsed.data) {
            // Add new field to dataset
            const newFieldName = parsed.fieldName;
            const fieldData = JSON.stringify(parsed.data);
            
            setDatasets(prev => prev.map(dataset => {
              if (dataset.id === datasetId) {
                // Check if field already exists
                if (!dataset.headers.includes(newFieldName)) {
                  // Add new column to headers
                  const newHeaders = [...dataset.headers, newFieldName];
                  // Add empty values to all rows except current row
                  const newRows = dataset.rows.map((row, index) => {
                    const newRow = [...row, ''];
                    if (index === currentRowIndex) {
                      newRow[newRow.length - 1] = fieldData;
                    }
                    return newRow;
                  });
                  
                  return {
                    ...dataset,
                    headers: newHeaders,
                    rows: newRows,
                    updatedAt: new Date().toISOString()
                  };
                } else {
                  // Field exists, update it normally
                  const fieldIndex = dataset.headers.indexOf(newFieldName);
                  const newRows = [...dataset.rows];
                  newRows[currentRowIndex][fieldIndex] = fieldData;
                  
                  return {
                    ...dataset,
                    rows: newRows,
                    updatedAt: new Date().toISOString()
                  };
                }
              }
              return dataset;
            }));
            return;
          }
        } catch (e) {
          console.error('Failed to parse field addition data:', e);
          return;
        }
      }
      
      // Normal field update
      const newRows = [...currentDataset.rows];
      newRows[currentRowIndex][headerIndex] = newValue;
      
      setDatasets(prev => prev.map(dataset => {
        if (dataset.id === datasetId) {
          return {
            ...dataset,
            rows: newRows,
            updatedAt: new Date().toISOString()
          };
        }
        return dataset;
      }));
    }
  }, [currentDataset, currentRowIndex, datasetId, setDatasets]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentRowIndex > 0) {
      setCurrentRowIndex(currentRowIndex - 1);
    } else if (direction === 'next' && currentRowIndex < csvData.length - 1) {
      setCurrentRowIndex(currentRowIndex + 1);
    }
  }, [currentRowIndex, csvData.length]);

  if (!currentDataset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Database className="h-16 w-16 mx-auto text-gray-500" />
          <h1 className="text-2xl font-bold text-white">Dataset Not Found</h1>
          <p className="text-gray-400">The requested dataset could not be found.</p>
          <Button onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Datasets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Datasets
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{currentDataset.name}</h1>
              <p className="text-gray-400">
                {csvData.length} rows • {headers.length} columns • {Object.keys(currentDataset.annotations).length} annotations
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Database className="h-4 w-4" />
              Export Annotated CSV
            </Button>
            <Button onClick={() => setShowAddField(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Field
            </Button>
            
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
                  onClick={() => handleViewerChange('tabular')}
                  className={viewerMode === 'tabular' ? 'bg-purple-900/20' : ''}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Tabular
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleViewerChange('basic')}
                  className={viewerMode === 'basic' ? 'bg-purple-900/20' : ''}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Basic
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleViewerChange('image')}
                  className={viewerMode === 'image' ? 'bg-purple-900/20' : ''}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Image
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleViewerChange('advanced')}
                  className={viewerMode === 'advanced' ? 'bg-purple-900/20' : ''}
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Advanced Annotator
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Viewer */}
        {csvData.length > 0 && (
          <>
            {viewerMode === 'tabular' ? (
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-gray-700">
                      <tr>
                        {headers.map((header, index) => (
                          <th
                            key={index}
                            className="px-6 py-4 text-left text-sm font-medium text-purple-300 border-r border-gray-700/50"
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
                          className="hover:bg-purple-900/20 cursor-pointer transition-all duration-200 text-sm"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-6 py-4 text-gray-300 border-r border-gray-700/30"
                            >
                              <div className="whitespace-pre-wrap break-words leading-relaxed">
                                {cell || ''}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : viewerMode === 'basic' ? (
              <BasicViewer
                currentRowData={csvData[currentRowIndex] || []}
                headers={headers}
                currentRowIndex={currentRowIndex}
                totalRows={csvData.length}
                datasetName={currentDataset.name}
                onFieldChange={handleFieldChange}
                onNavigate={handleNavigate}
              />
            ) : viewerMode === 'image' ? (
              <ImageViewer
                currentRowData={csvData[currentRowIndex] || []}
                headers={headers}
                currentRowIndex={currentRowIndex}
                totalRows={csvData.length}
                datasetName={currentDataset.name}
                onFieldChange={handleFieldChange}
                onNavigate={handleNavigate}
              />
            ) : (
              <AdvancedAnnotatorViewer
                currentRowData={csvData[currentRowIndex] || []}
                headers={headers}
                currentRowIndex={currentRowIndex}
                totalRows={csvData.length}
                datasetName={currentDataset.name}
                onFieldChange={handleFieldChange}
                onNavigate={handleNavigate}
              />
            )}
          </>
        )}

        {/* Add Field Modal */}
        <Sheet open={showAddField} onOpenChange={setShowAddField}>
          <SheetContent side="right" className="w-96 bg-gray-900 border-l border-gray-700">
            <SheetHeader>
              <SheetTitle className="text-white">Add Custom Field</SheetTitle>
              <SheetDescription className="text-gray-400">
                Add a new editable field to your dataset
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Field Name</label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Enter field name..."
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    if (newFieldName.trim()) {
                      addCustomField(newFieldName.trim());
                      setNewFieldName('');
                      setShowAddField(false);
                    }
                  }}
                  disabled={!newFieldName.trim()}
                  className="flex-1"
                >
                  Add Field
                </Button>
                <Button
                  onClick={() => {
                    setNewFieldName('');
                    setShowAddField(false);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

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
                      Dataset: {currentDataset.name} • Row {selectedRowIndex !== null ? selectedRowIndex + 1 : 0} of {csvData.length}
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

                {/* Custom Fields Section */}
                {currentDataset?.customFields && Object.keys(currentDataset.customFields).length > 0 && (
                  <div className="border-t border-gray-700 pt-6 space-y-6">
                    <h4 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                      <PencilIcon className="h-5 w-5" />
                      Custom Fields <span className="text-sm text-gray-400 font-normal">(auto-saves as you type)</span>
                    </h4>
                    {Object.entries(currentDataset.customFields).map(([fieldName, field]) => (
                      <div key={fieldName} className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">{fieldName}</label>
                        <Textarea
                          value={customFieldValues[fieldName] || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setCustomFieldValues(prev => ({ ...prev, [fieldName]: newValue }));
                            if (selectedRowIndex !== null) {
                              updateCustomField(fieldName, selectedRowIndex, newValue);
                            }
                          }}
                          placeholder={`Enter ${fieldName}...`}
                          className="min-h-[80px] text-base"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Annotation Section */}
                <div className="border-t border-gray-700 pt-6 space-y-4">
                  <h4 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                    <PencilIcon className="h-5 w-5" />
                    {currentDataset && currentDataset.reasonColumnIndex !== undefined ? 
                      `${currentDataset.headers[currentDataset.reasonColumnIndex]} Annotation` : 
                      'Annotation'
                    } <span className="text-sm text-gray-400 font-normal">(auto-saves as you type)</span>
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
}
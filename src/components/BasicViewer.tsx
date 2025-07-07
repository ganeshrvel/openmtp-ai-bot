'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, PencilIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface BasicViewerProps {
  currentRowData: string[];
  headers: string[];
  currentRowIndex: number;
  totalRows: number;
  datasetName: string;
  onFieldChange: (headerIndex: number, newValue: string) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export const BasicViewer = React.memo(({ 
  currentRowData, 
  headers, 
  currentRowIndex, 
  totalRows,
  datasetName,
  onFieldChange,
  onNavigate 
}: BasicViewerProps) => {
  
  if (!currentRowData || currentRowData.length === 0) return null;

  const isUrl = (value: string) => {
    try {
      return value && (value.startsWith('http://') || value.startsWith('https://'));
    } catch {
      return false;
    }
  };

  const isCorrectnessField = (header: string) => {
    return header.toLowerCase().includes('correctness') || 
           header.toLowerCase() === 'status';
  };

  const isEditableField = (header: string) => {
    return header.toLowerCase().includes('reason');
  };

  const isSlField = (header: string) => {
    return header.toLowerCase() === 'sl';
  };

  const getCorrectnessValue = (value: string): 'pass' | 'fail' | 'unsure' | null => {
    const lowerValue = value?.toLowerCase() || '';
    if (!value || value.trim() === '') return null; // No selection when empty
    if (lowerValue.includes('pass') || lowerValue.includes('correct') || lowerValue === 'true') return 'pass';
    if (lowerValue.includes('fail') || lowerValue.includes('incorrect') || lowerValue === 'false') return 'fail';
    if (lowerValue.includes('unsure') || lowerValue === 'unsure') return 'unsure';
    return null; // No selection for unrecognized values
  };

  const handleCorrectnessChange = (headerIndex: number, newValue: 'pass' | 'fail' | 'unsure') => {
    onFieldChange(headerIndex, newValue);
  };

  const handleTextFieldChange = (headerIndex: number, newValue: string) => {
    onFieldChange(headerIndex, newValue);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
      {/* Navigation Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Show SL field */}
            {(() => {
              const slIndex = headers.findIndex(h => h.toLowerCase() === 'sl');
              const slValue = slIndex !== -1 ? currentRowData[slIndex] : null;
              return slValue ? (
                <div className="px-3 py-1 bg-purple-900/30 rounded-lg border border-purple-700/50">
                  <span className="text-sm text-purple-300">#{slValue}</span>
                </div>
              ) : null;
            })()}
            
            <div className="px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-600">
              <span className="text-sm font-medium text-gray-300">
                {currentRowIndex + 1} / {totalRows}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('prev')}
              disabled={currentRowIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('next')}
              disabled={currentRowIndex === totalRows - 1}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {headers.map((header, index) => {
          const value = currentRowData[index] || '';
          
          // Skip sl field since it's shown in header
          if (isSlField(header)) {
            return null;
          }
          
          return (
            <div key={index} className="space-y-3">
              <h3 className="text-base font-semibold text-purple-300 border-b border-gray-700/50 pb-1">
                {header}
              </h3>
              
              {/* Correctness Toggle Field */}
              {isCorrectnessField(header) ? (
                <div className="flex items-center gap-3">
                  {(['pass', 'fail', 'unsure'] as const).map((option) => {
                    const isSelected = getCorrectnessValue(value) === option;
                    return (
                      <Button
                        key={option}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleCorrectnessChange(index, option);
                        }}
                        className={`min-w-20 h-9 ${
                          isSelected ? 
                            option === 'pass' ? 'bg-green-600 hover:bg-green-700' :
                            option === 'fail' ? 'bg-red-600 hover:bg-red-700' :
                            'bg-yellow-600 hover:bg-yellow-700'
                          : ''
                        }`}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Button>
                    );
                  })}
                </div>
              ) : isUrl(value) ? (
                /* URL Field - Readonly */
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline break-all transition-colors duration-200"
                  >
                    {value}
                  </a>
                </div>
              ) : isEditableField(header) ? (
                /* Editable Fields: reason only */
                <Textarea
                  value={value}
                  onChange={(e) => handleTextFieldChange(index, e.target.value)}
                  className="min-h-[120px] text-base leading-relaxed resize-none"
                  placeholder={`Enter ${header}...`}
                />
              ) : (
                /* Readonly Text Fields - Show full content */
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words text-sm">
                    {value || (
                      <span className="text-gray-500 italic">No data</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

BasicViewer.displayName = 'BasicViewer';
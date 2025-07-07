'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ImageViewerProps {
  currentRowData: string[];
  headers: string[];
  currentRowIndex: number;
  totalRows: number;
  datasetName: string;
  onFieldChange: (headerIndex: number, newValue: string) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export const ImageViewer = React.memo(({ 
  currentRowData, 
  headers, 
  currentRowIndex, 
  totalRows,
  datasetName,
  onFieldChange,
  onNavigate 
}: ImageViewerProps) => {
  
  const [imageError, setImageError] = useState<{[key: number]: boolean}>({});
  const [imageLoading, setImageLoading] = useState<{[key: number]: boolean}>({});
  
  // Reset image states when row changes
  useEffect(() => {
    setImageError({});
    setImageLoading({});
  }, [currentRowIndex]);
  
  if (!currentRowData || currentRowData.length === 0) return null;

  const isImageField = (header: string, value: string) => {
    const lowerHeader = header.toLowerCase();
    
    // Primarily look for image_output field
    if (lowerHeader === 'image_output') {
      return true;
    }
    
    // Fallback to other image-related headers
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowerValue = value?.toLowerCase() || '';
    
    return (
      lowerHeader.includes('image') ||
      lowerHeader.includes('img') ||
      lowerHeader.includes('photo') ||
      lowerHeader.includes('picture') ||
      value && (value.startsWith('http') && imageExtensions.some(ext => lowerValue.includes(ext))) ||
      value && imageExtensions.some(ext => lowerValue.endsWith(ext))
    );
  };

  const isResponseField = (header: string) => {
    return header.toLowerCase().includes('response') || 
           header.toLowerCase().includes('answer') ||
           header.toLowerCase().includes('reply');
  };

  const isReasonField = (header: string) => {
    return header.toLowerCase().includes('reason');
  };

  const isCorrectnessField = (header: string) => {
    return header.toLowerCase().includes('correctness') || 
           header.toLowerCase() === 'status' ||
           header.toLowerCase().includes('correct');
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

  const handleResponseChange = (headerIndex: number, newValue: string) => {
    onFieldChange(headerIndex, newValue);
  };

  const handleImageError = (index: number) => {
    setImageError(prev => ({ ...prev, [index]: true }));
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoad = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoadStart = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: true }));
    setImageError(prev => ({ ...prev, [index]: false }));
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
      <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
        {/* Images Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-purple-300 border-b border-gray-700/50 pb-2">
            Images
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {headers.map((header, index) => {
              const value = currentRowData[index] || '';
              
              if (!isImageField(header, value) || isSlField(header)) {
                return null;
              }
              
              return (
                <div key={index} className="space-y-3">
                  <h3 className="text-base font-semibold text-purple-300">
                    {header}
                  </h3>
                  
                  <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                    {value ? (
                      <div className="space-y-3">
                        <div className="relative">
                          {imageLoading[index] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 rounded-lg z-10">
                              <div className="flex flex-col items-center text-gray-300">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <div className="text-sm">Loading image...</div>
                              </div>
                            </div>
                          )}
                          {!imageError[index] ? (
                            <>
                              <img
                                key={`${currentRowIndex}-${index}`}
                                src={value}
                                alt={`${header} - Image ${currentRowIndex + 1}`}
                                className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-600/50"
                                onLoad={() => handleImageLoad(index)}
                                onLoadStart={() => handleImageLoadStart(index)}
                                onError={() => handleImageError(index)}
                              />
                              {!imageLoading[index] && (
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                  <Eye className="h-3 w-3 inline mr-1" />
                                  Mounted
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-48 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
                              <div className="text-center text-gray-400">
                                <EyeOff className="h-8 w-8 mx-auto mb-2" />
                                <div className="text-sm font-medium">Failed to mount image</div>
                                <div className="text-xs mt-2 bg-red-900/20 border border-red-800/50 rounded p-2 max-w-xs">
                                  <div className="text-red-400 font-mono break-all">
                                    {value}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-700/50 rounded p-2">
                          <div className="text-xs text-gray-400 font-mono break-all">
                            URL: {value}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
                        <div className="text-center text-gray-400">
                          <EyeOff className="h-8 w-8 mx-auto mb-2" />
                          <div className="text-sm font-medium">No image URL provided</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Annotation Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-purple-300 border-b border-gray-700/50 pb-2">
            Annotations
          </h2>
          
          {/* Always show reason field first */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-purple-300 border-b border-gray-700/50 pb-1">
              Reason
            </h3>
            <Textarea
              value={(() => {
                const reasonIndex = headers.findIndex(h => isReasonField(h));
                return reasonIndex !== -1 ? currentRowData[reasonIndex] || '' : '';
              })()}
              onChange={(e) => {
                const reasonIndex = headers.findIndex(h => isReasonField(h));
                if (reasonIndex !== -1) {
                  handleResponseChange(reasonIndex, e.target.value);
                }
              }}
              className="min-h-[120px] text-base leading-relaxed resize-none"
              placeholder="Enter your reason for the failure or annotation..."
            />
          </div>
          
          {headers.map((header, index) => {
            const value = currentRowData[index] || '';
            
            // Skip image fields, sl field, and reason field (already shown above)
            if (isImageField(header, value) || isSlField(header) || isReasonField(header)) {
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
                ) : isResponseField(header) ? (
                  /* Response Fields - Editable */
                  <Textarea
                    value={value}
                    onChange={(e) => handleResponseChange(index, e.target.value)}
                    className="min-h-[120px] text-base leading-relaxed resize-none"
                    placeholder={`Enter ${header}...`}
                  />
                ) : (
                  /* Other Text Fields - Readonly */
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
    </div>
  );
});

ImageViewer.displayName = 'ImageViewer';

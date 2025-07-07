'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal
} from '@floating-ui/react';

interface Annotation {
  id: string;
  start: number;
  end: number;
  selectedText: string;
  comment: string;
  correctness: 'pass' | 'fail' | 'unsure';
}

interface AdvAnnotations {
  annotations: Annotation[];
}

interface AdvancedAnnotatorViewerProps {
  currentRowData: string[];
  headers: string[];
  currentRowIndex: number;
  totalRows: number;
  datasetName: string;
  onFieldChange: (headerIndex: number, newValue: string) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export const AdvancedAnnotatorViewer = React.memo(({ 
  currentRowData, 
  headers, 
  currentRowIndex, 
  totalRows,
  datasetName,
  onFieldChange,
  onNavigate 
}: AdvancedAnnotatorViewerProps) => {
  
  const [selectedRange, setSelectedRange] = useState<{ start: number, end: number, fieldIndex: number } | null>(null);
  const [annotations, setAnnotations] = useState<{ [fieldIndex: number]: AdvAnnotations }>({});
  const [newComment, setNewComment] = useState('');
  const [newCorrectness, setNewCorrectness] = useState<'pass' | 'fail' | 'unsure'>('fail');
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const textRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  
  // Floating UI for selection popover
  const { refs, floatingStyles, context } = useFloating({
    open: isSelectionOpen,
    onOpenChange: setIsSelectionOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);
  
  if (!currentRowData || currentRowData.length === 0) return null;

  const isLLMResponseField = (header: string) => {
    return header.toLowerCase().includes('llm_response') || 
           header.toLowerCase().includes('response') ||
           header.toLowerCase().includes('answer');
  };

  const isCorrectnessField = (header: string) => {
    return header.toLowerCase().includes('correctness') || 
           header.toLowerCase() === 'status';
  };

  const isReasonField = (header: string) => {
    return header.toLowerCase().includes('reason') && !header.toLowerCase().includes('adv_reason');
  };

  const isAdvReasonField = (header: string) => {
    return header.toLowerCase().includes('adv_reason');
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

  // Load annotations from adv_reason field
  useEffect(() => {
    const newAnnotations: { [fieldIndex: number]: AdvAnnotations } = {};
    
    headers.forEach((header, index) => {
      if (isAdvReasonField(header)) {
        const value = currentRowData[index];
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.annotations) {
              // Find the corresponding LLM response field
              const llmFieldIndex = headers.findIndex(h => isLLMResponseField(h));
              if (llmFieldIndex !== -1) {
                newAnnotations[llmFieldIndex] = parsed;
              }
            }
          } catch (e) {
            console.warn('Failed to parse adv_reason JSON:', e);
          }
        }
      }
    });
    
    setAnnotations(newAnnotations);
  }, [currentRowData, headers, currentRowIndex]);

  // Auto-create adv_reason field if it doesn't exist and we're in advanced viewer
  useEffect(() => {
    const hasAdvReasonField = headers.some(h => isAdvReasonField(h));
    if (!hasAdvReasonField) {
      // Add the field with empty data
      const emptyAnnotations = { annotations: [] };
      const fieldData = { fieldName: 'adv_reason', data: emptyAnnotations };
      onFieldChange(-1, JSON.stringify(fieldData));
    }
  }, [headers, onFieldChange]);

  const saveAnnotations = useCallback((fieldIndex: number, fieldAnnotations: AdvAnnotations) => {
    let advReasonIndex = headers.findIndex(h => isAdvReasonField(h));
    
    // If adv_reason field doesn't exist, we need to add it
    if (advReasonIndex === -1) {
      // Add the adv_reason field to headers - this should trigger the parent to add the column
      const newFieldName = 'adv_reason';
      // For now, we'll use a negative index to signal that we need to add this field
      // The parent component should handle adding the field
      console.log('Need to add adv_reason field to dataset');
      // We'll save to index -1 as a signal to add the field
      onFieldChange(-1, JSON.stringify({ fieldName: newFieldName, data: fieldAnnotations }));
    } else {
      onFieldChange(advReasonIndex, JSON.stringify(fieldAnnotations));
    }
  }, [headers, onFieldChange]);

  const handleTextSelection = useCallback((fieldIndex: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textElement = textRefs.current[fieldIndex];
    if (!textElement || !textElement.contains(range.commonAncestorContainer)) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Calculate start and end positions relative to the text content
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(textElement);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    const end = start + selectedText.length;

    setSelectedRange({ start, end, fieldIndex });
    
    // Set the reference element for floating UI
    const rect = range.getBoundingClientRect();
    refs.setReference({
      getBoundingClientRect: () => rect,
    });
    
    setIsSelectionOpen(true);
    selection.removeAllRanges();
  }, [refs]);

  const addAnnotation = useCallback(() => {
    if (!selectedRange || !newComment.trim()) return;

    const { fieldIndex, start, end } = selectedRange;
    const selectedText = currentRowData[fieldIndex].substring(start, end);
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      start,
      end,
      selectedText,
      comment: newComment.trim(),
      correctness: newCorrectness
    };

    const currentAnnotations = annotations[fieldIndex] || { annotations: [] };
    const updatedAnnotations = {
      annotations: [...currentAnnotations.annotations, newAnnotation]
    };

    setAnnotations(prev => ({ ...prev, [fieldIndex]: updatedAnnotations }));
    saveAnnotations(fieldIndex, updatedAnnotations);
    
    setSelectedRange(null);
    setIsSelectionOpen(false);
    setNewComment('');
    setNewCorrectness('fail');
  }, [selectedRange, newComment, newCorrectness, annotations, currentRowData, saveAnnotations]);

  const deleteAnnotation = useCallback((fieldIndex: number, annotationId: string) => {
    const currentAnnotations = annotations[fieldIndex];
    if (!currentAnnotations) return;

    const updatedAnnotations = {
      annotations: currentAnnotations.annotations.filter(a => a.id !== annotationId)
    };

    setAnnotations(prev => ({ ...prev, [fieldIndex]: updatedAnnotations }));
    saveAnnotations(fieldIndex, updatedAnnotations);
  }, [annotations, saveAnnotations]);

  const cancelSelection = useCallback(() => {
    setSelectedRange(null);
    setIsSelectionOpen(false);
    setNewComment('');
    setNewCorrectness('fail');
  }, []);

  const renderAnnotatedText = (text: string, fieldIndex: number) => {
    const fieldAnnotations = annotations[fieldIndex]?.annotations || [];
    if (fieldAnnotations.length === 0) {
      return <span>{text}</span>;
    }

    // Sort annotations by start position
    const sortedAnnotations = [...fieldAnnotations].sort((a, b) => a.start - b.start);
    
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation, index) => {
      // Add text before annotation
      if (annotation.start > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, annotation.start)}
          </span>
        );
      }

      // Add annotated text
      const colorClass = annotation.correctness === 'pass' ? 'bg-green-200/30 border-green-500' :
                         annotation.correctness === 'fail' ? 'bg-red-200/30 border-red-500' :
                         'bg-yellow-200/30 border-yellow-500';

      elements.push(
        <Popover key={annotation.id}>
          <PopoverTrigger asChild>
            <span
              className={`relative cursor-pointer border-b-2 ${colorClass} hover:opacity-80 transition-all`}
            >
              {annotation.selectedText}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 bg-gray-900 border-gray-700">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge 
                  variant={annotation.correctness === 'pass' ? 'default' : 'destructive'}
                  className={
                    annotation.correctness === 'pass' ? 'bg-green-600' :
                    annotation.correctness === 'fail' ? 'bg-red-600' :
                    'bg-yellow-600'
                  }
                >
                  {annotation.correctness.charAt(0).toUpperCase() + annotation.correctness.slice(1)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAnnotation(fieldIndex, annotation.id)}
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-sm text-gray-300 bg-gray-800 p-2 rounded border border-gray-700">
                "{annotation.selectedText}"
              </div>
              <div className="text-sm text-gray-200">
                {annotation.comment}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );

      lastIndex = annotation.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <>{elements}</>;
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
          
          // Skip sl field since it's shown in header and adv_reason field (internal)
          if (isSlField(header) || isAdvReasonField(header)) {
            return null;
          }
          
          return (
            <div key={index} className="space-y-3">
              <h3 className="text-base font-semibold text-purple-300 border-b border-gray-700/50 pb-1">
                {header}
              </h3>
              
              {/* LLM Response Fields - With Annotation Support */}
              {isLLMResponseField(header) ? (
                <div className="space-y-4">
                  <div 
                    ref={el => textRefs.current[index] = el}
                    className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 cursor-text select-text leading-relaxed"
                    onMouseUp={() => handleTextSelection(index)}
                  >
                    <div className="text-gray-300 whitespace-pre-wrap break-words text-sm">
                      {renderAnnotatedText(value, index)}
                    </div>
                  </div>
                  
                </div>
              ) : isCorrectnessField(header) ? (
                /* Correctness Toggle Field */
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
                          onFieldChange(index, option);
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
              ) : isReasonField(header) ? (
                /* Regular Reason Field - Editable */
                <Textarea
                  value={value}
                  onChange={(e) => onFieldChange(index, e.target.value)}
                  className="min-h-[120px] text-base leading-relaxed resize-none"
                  placeholder="Enter general reason or notes..."
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

      {/* Floating Selection Popover */}
      {isSelectionOpen && selectedRange && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50"
            {...getFloatingProps()}
          >
            <FloatingFocusManager context={context} modal={false}>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl max-w-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-purple-300">
                    <MessageSquare className="h-4 w-4" />
                    <span>Selected: "{currentRowData[selectedRange.fieldIndex]?.substring(selectedRange.start, selectedRange.end)}"</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">Correctness:</span>
                      {(['pass', 'fail', 'unsure'] as const).map((option) => (
                        <Button
                          key={option}
                          variant={newCorrectness === option ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNewCorrectness(option)}
                          className={`min-w-16 h-8 text-xs ${
                            newCorrectness === option ? 
                              option === 'pass' ? 'bg-green-600 hover:bg-green-700' :
                              option === 'fail' ? 'bg-red-600 hover:bg-red-700' :
                              'bg-yellow-600 hover:bg-yellow-700'
                            : ''
                          }`}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Button>
                      ))}
                    </div>
                    
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add your comment about this selection..."
                      className="min-h-[80px] text-sm"
                    />
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={addAnnotation}
                        disabled={!newComment.trim()}
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="h-3 w-3" />
                        Add Annotation
                      </Button>
                      <Button
                        onClick={cancelSelection}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </FloatingFocusManager>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
});

AdvancedAnnotatorViewer.displayName = 'AdvancedAnnotatorViewer';
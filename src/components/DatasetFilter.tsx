'use client';

import React, { useState, useCallback } from 'react';
import { Filter, X, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'empty' | 'not_empty' | 'col_equals' | 'col_not_equals';

export interface FilterRule {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
  compareColumn?: string; // For column-to-column comparisons
}

interface DatasetFilterProps {
  headers: string[];
  filters: FilterRule[];
  onFiltersChange: (filters: FilterRule[]) => void;
  className?: string;
}

const OPERATORS: { value: FilterOperator; label: string; needsValue: boolean; needsColumn: boolean }[] = [
  { value: 'equals', label: 'Equals', needsValue: true, needsColumn: false },
  { value: 'not_equals', label: 'Not Equals', needsValue: true, needsColumn: false },
  { value: 'contains', label: 'Contains', needsValue: true, needsColumn: false },
  { value: 'not_contains', label: 'Not Contains', needsValue: true, needsColumn: false },
  { value: 'starts_with', label: 'Starts With', needsValue: true, needsColumn: false },
  { value: 'ends_with', label: 'Ends With', needsValue: true, needsColumn: false },
  { value: 'empty', label: 'Is Empty', needsValue: false, needsColumn: false },
  { value: 'not_empty', label: 'Is Not Empty', needsValue: false, needsColumn: false },
  { value: 'col_equals', label: 'Equals Column', needsValue: false, needsColumn: true },
  { value: 'col_not_equals', label: 'Not Equals Column', needsValue: false, needsColumn: true },
];

export const DatasetFilter: React.FC<DatasetFilterProps> = ({
  headers,
  filters,
  onFiltersChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const addFilter = useCallback(() => {
    const newFilter: FilterRule = {
      id: Date.now().toString(),
      column: headers[0] || '',
      operator: 'contains',
      value: '',
      compareColumn: headers[1] || headers[0] || ''
    };
    onFiltersChange([...filters, newFilter]);
  }, [headers, filters, onFiltersChange]);

  const updateFilter = useCallback((id: string, updates: Partial<FilterRule>) => {
    onFiltersChange(filters.map(filter => {
      if (filter.id === id) {
        const updated = { ...filter, ...updates };
        // Reset compare column if switching from column comparison to value comparison
        if (updates.operator && !OPERATORS.find(op => op.value === updates.operator)?.needsColumn) {
          updated.compareColumn = '';
        }
        // Set default compare column if switching to column comparison
        if (updates.operator && OPERATORS.find(op => op.value === updates.operator)?.needsColumn && !updated.compareColumn) {
          updated.compareColumn = headers[1] || headers[0] || '';
        }
        return updated;
      }
      return filter;
    }));
  }, [filters, onFiltersChange, headers]);

  const removeFilter = useCallback((id: string) => {
    onFiltersChange(filters.filter(filter => filter.id !== id));
  }, [filters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange([]);
    setIsOpen(false);
  }, [onFiltersChange]);

  const activeFiltersCount = filters.length;

  return (
    <div className={`relative ${className}`}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`gap-2 ${activeFiltersCount > 0 ? 'bg-purple-900/20 border-purple-700' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeFiltersCount > 0 && (
              <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-96 p-4 bg-gray-900 border-gray-700" 
          align="start"
          side="bottom"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-200">Filters</h3>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  Clear All
                </Button>
              )}
            </div>

            {filters.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No filters applied
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filters.map((filter) => (
                  <div key={filter.id} className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-medium">Filter Rule</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilter(filter.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {/* Column Selection */}
                      <Select 
                        value={filter.column} 
                        onValueChange={(value) => updateFilter(filter.id, { column: value })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map(header => (
                            <SelectItem key={header} value={header} className="text-xs">
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Operator Selection */}
                      <Select 
                        value={filter.operator} 
                        onValueChange={(value) => updateFilter(filter.id, { 
                          operator: value as FilterOperator,
                          value: OPERATORS.find(op => op.value === value)?.needsValue ? filter.value : ''
                        })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map(op => (
                            <SelectItem key={op.value} value={op.value} className="text-xs">
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value Input */}
                    {OPERATORS.find(op => op.value === filter.operator)?.needsValue && (
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Filter value..."
                        className="text-xs"
                      />
                    )}

                    {/* Column Comparison Selector */}
                    {OPERATORS.find(op => op.value === filter.operator)?.needsColumn && (
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400">Compare to column:</label>
                        <Select 
                          value={filter.compareColumn || ''} 
                          onValueChange={(value) => updateFilter(filter.id, { compareColumn: value })}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {headers.filter(h => h !== filter.column).map(header => (
                              <SelectItem key={header} value={header} className="text-xs">
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button 
              onClick={addFilter} 
              variant="outline" 
              size="sm" 
              className="w-full gap-2 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add Filter
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Helper function to apply filters to data
export const applyFilters = (
  data: string[][],
  headers: string[],
  filters: FilterRule[]
): number[] => {
  if (filters.length === 0) return data.map((_, index) => index);

  return data.reduce<number[]>((validIndices, row, rowIndex) => {
    const matchesAllFilters = filters.every(filter => {
      const columnIndex = headers.indexOf(filter.column);
      if (columnIndex === -1) return true; // Column not found, skip filter
      
      const cellValue = (row[columnIndex] || '').toLowerCase();
      const filterValue = filter.value.toLowerCase();

      switch (filter.operator) {
        case 'equals':
          return cellValue === filterValue;
        case 'not_equals':
          return cellValue !== filterValue;
        case 'contains':
          return cellValue.includes(filterValue);
        case 'not_contains':
          return !cellValue.includes(filterValue);
        case 'starts_with':
          return cellValue.startsWith(filterValue);
        case 'ends_with':
          return cellValue.endsWith(filterValue);
        case 'empty':
          return cellValue.trim() === '';
        case 'not_empty':
          return cellValue.trim() !== '';
        case 'col_equals':
          if (!filter.compareColumn) return true;
          const compareColumnIndex = headers.indexOf(filter.compareColumn);
          if (compareColumnIndex === -1) return true;
          const compareValue = (row[compareColumnIndex] || '').toLowerCase();
          return cellValue === compareValue;
        case 'col_not_equals':
          if (!filter.compareColumn) return true;
          const compareColumnIndex2 = headers.indexOf(filter.compareColumn);
          if (compareColumnIndex2 === -1) return true;
          const compareValue2 = (row[compareColumnIndex2] || '').toLowerCase();
          return cellValue !== compareValue2;
        default:
          return true;
      }
    });

    if (matchesAllFilters) {
      validIndices.push(rowIndex);
    }
    return validIndices;
  }, []);
};
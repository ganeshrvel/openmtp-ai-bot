'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Database, Eye, FileText, Save, Trash2, CheckCircle, Circle, Filter, Search, Settings, Edit3, EyeOff } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useLocalStorageState from 'use-local-storage-state';

interface CleaningProject {
  id: string;
  name: string;
  sourcePath: string;
  outputPath: string;
  fileIndex: string[];
  filePathMapping?: { [filename: string]: { sourcePath: string; outputPath: string } };
  modifiedFiles: { [filename: string]: boolean };
  completedFiles: { [filename: string]: boolean };
  createdAt: string;
  updatedAt: string;
}

interface JsonData {
  [key: string]: any;
}

type FieldViewerType = 'text' | 'textarea' | 'markdown' | 'multiselect' | 'number' | 'boolean';

interface FieldConfig {
  type: FieldViewerType;
  options?: string[]; // For multiselect
  isEditing?: boolean; // Per-field edit state
}

interface ProjectFieldConfig {
  [fieldPath: string]: FieldConfig;
}

export default function CleaningProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [projects, setProjects] = useLocalStorageState<CleaningProject[]>('cleaning-projects', {
    defaultValue: []
  });
  
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'tabular' | 'simple'>('tabular');
  const [jsonData, setJsonData] = useState<JsonData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileFilter, setFileFilter] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [searchIssueNum, setSearchIssueNum] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Field configuration per project
  const [fieldConfigs, setFieldConfigs] = useLocalStorageState<ProjectFieldConfig>(
    `field-configs-${projectId}`, 
    { defaultValue: {} }
  );

  const currentProject = projects.find(p => p.id === projectId);
  
  // Filter files based on completion status
  const filteredFiles = currentProject?.fileIndex.filter(file => {
    if (fileFilter === 'all') return true;
    if (fileFilter === 'completed') return currentProject.completedFiles?.[file] === true;
    if (fileFilter === 'incomplete') return currentProject.completedFiles?.[file] !== true;
    return true;
  }) || [];
  
  const currentFile = filteredFiles[currentFileIndex];

  // Load JSON data for current file
  useEffect(() => {
    if (currentProject && currentFile) {
      setIsLoading(true);
      
      const loadFile = async () => {
        try {
          const response = await fetch(`/api/dataset-cleaner/files?outputPath=${encodeURIComponent(currentProject.outputPath)}&filename=${encodeURIComponent(currentFile)}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load file');
          }
          
          const result = await response.json();
          
          if (result.success) {
            setJsonData(result.data);
          } else {
            setJsonData({ error: result.error || 'Unknown error' });
          }
        } catch (error) {
          console.error('Error loading file data:', error);
          setJsonData({ error: `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}` });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadFile();
    }
  }, [currentProject, currentFile]);

  // Reset file index when filter changes
  useEffect(() => {
    setCurrentFileIndex(0);
  }, [fileFilter]);

  // Cleanup auto-save timeout when file changes or component unmounts
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [currentFile]);

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const autoSaveFile = useCallback(async (data: JsonData) => {
    if (!currentProject || !currentFile) return;
    
    setAutoSaveStatus('saving');
    
    try {
      const response = await fetch('/api/dataset-cleaner/files', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outputPath: currentProject.outputPath,
          filename: currentFile,
          data: data
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save file');
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      
      // Mark file as modified
      setProjects(prev => prev.map(project => {
        if (project.id === projectId) {
          return {
            ...project,
            modifiedFiles: {
              ...project.modifiedFiles,
              [currentFile]: true
            },
            updatedAt: new Date().toISOString()
          };
        }
        return project;
      }));
      
      setAutoSaveStatus('saved');
      console.log('File auto-saved successfully:', currentFile);
    } catch (error) {
      console.error('Error auto-saving file:', error);
      setAutoSaveStatus('error');
      // Reset to saved after 3 seconds
      setTimeout(() => setAutoSaveStatus('saved'), 3000);
    }
  }, [currentProject, currentFile, projectId, setProjects]);

  const handleFieldChange = useCallback((path: string, value: any) => {
    setJsonData(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      
      // Navigate to the parent of the target field
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      // Set the value
      current[keys[keys.length - 1]] = value;
      
      // Debounced auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveFile(updated);
      }, 1000); // Save after 1 second of inactivity
      
      return updated;
    });
  }, [autoSaveFile]);

  const saveCurrentFile = useCallback(async () => {
    if (!currentProject || !currentFile) return;
    
    setIsSaving(true);
    
    try {
      // Save the updated JSON data to the actual output directory via API
      const response = await fetch('/api/dataset-cleaner/files', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outputPath: currentProject.outputPath,
          filename: currentFile,
          data: jsonData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save file');
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      
      // Mark file as modified
      setProjects(prev => prev.map(project => {
        if (project.id === projectId) {
          return {
            ...project,
            modifiedFiles: {
              ...project.modifiedFiles,
              [currentFile]: true
            },
            updatedAt: new Date().toISOString()
          };
        }
        return project;
      }));
      
      console.log('File saved successfully to output directory:', currentFile);
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, currentFile, projectId, setProjects, jsonData]);

  const toggleFileCompletion = useCallback(() => {
    if (!currentProject || !currentFile) return;
    
    setProjects(prev => prev.map(project => {
      if (project.id === projectId) {
        const currentStatus = project.completedFiles?.[currentFile] || false;
        return {
          ...project,
          completedFiles: {
            ...project.completedFiles,
            [currentFile]: !currentStatus
          },
          updatedAt: new Date().toISOString()
        };
      }
      return project;
    }));
  }, [currentProject, currentFile, projectId, setProjects]);

  const searchForIssue = useCallback(() => {
    if (!currentProject) return;
    
    const targetIssueNum = searchIssueNum.trim();
    if (!targetIssueNum) {
      alert('Please enter an issue number to search for.');
      return;
    }
    
    // Look for file that contains the issue number
    const foundIndex = filteredFiles.findIndex(filename => {
      // Check if filename contains the issue number
      // This could be in formats like: issue_123.json, 123.json, issue-123.json, etc.
      return filename.toLowerCase().includes(targetIssueNum.toLowerCase()) || 
             filename.toLowerCase().includes(`issue_${targetIssueNum.toLowerCase()}`) ||
             filename.toLowerCase().includes(`issue-${targetIssueNum.toLowerCase()}`) ||
             filename.toLowerCase().includes(`${targetIssueNum.toLowerCase()}.json`);
    });
    
    if (foundIndex !== -1) {
      setCurrentFileIndex(foundIndex);
      setSearchIssueNum(''); // Clear search after finding
    } else {
      alert(`Issue ${targetIssueNum} not found in current filtered files. Total files: ${filteredFiles.length}`);
    }
  }, [currentProject, searchIssueNum, filteredFiles]);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchForIssue();
    }
  }, [searchForIssue]);

  // Helper functions for field configuration
  const getFieldConfig = useCallback((path: string): FieldConfig => {
    return fieldConfigs[path] || { type: 'text', isEditing: false };
  }, [fieldConfigs]);

  const updateFieldConfig = useCallback((path: string, config: Partial<FieldConfig>) => {
    setFieldConfigs(prev => ({
      ...prev,
      [path]: { ...getFieldConfig(path), ...config }
    }));
  }, [fieldConfigs, getFieldConfig, setFieldConfigs]);

  const toggleFieldEdit = useCallback((path: string) => {
    const currentConfig = getFieldConfig(path);
    updateFieldConfig(path, { isEditing: !currentConfig.isEditing });
  }, [getFieldConfig, updateFieldConfig]);

  // Auto-detect field type based on key and value
  const autoDetectFieldType = useCallback((key: string, value: any): FieldViewerType => {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('description') || keyLower.includes('body') || keyLower.includes('content')) {
      return 'markdown';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'multiselect';
    if (typeof value === 'string' && value.length > 100) return 'textarea';
    
    return 'text';
  }, []);

  const renderMarkdown = useCallback((content: string) => {
    // Simple markdown renderer for basic formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  }, []);


  const navigateFile = useCallback((direction: 'prev' | 'next') => {
    if (!currentProject) return;
    
    if (direction === 'prev' && currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    } else if (direction === 'next' && currentFileIndex < filteredFiles.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    }
  }, [currentFileIndex, currentProject, filteredFiles.length]);

  const renderJsonField = useCallback((key: string, value: any, path: string = key): React.ReactNode => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <div key={path} className="space-y-3">
          <h4 className="text-sm font-medium text-purple-300 border-b border-gray-700 pb-1">
            {key}
          </h4>
          <div className="pl-4 space-y-3 border-l border-gray-700">
            {Object.entries(value).map(([subKey, subValue]) => 
              renderJsonField(subKey, subValue, `${path}.${subKey}`)
            )}
          </div>
        </div>
      );
    } else if (Array.isArray(value) && getFieldConfig(path).type !== 'multiselect') {
      return (
        <div key={path} className="space-y-3">
          <h4 className="text-sm font-medium text-purple-300 border-b border-gray-700 pb-1">
            {key} (Array)
          </h4>
          <div className="pl-4 space-y-3 border-l border-gray-700">
            {value.map((item, index) => 
              renderJsonField(`[${index}]`, item, `${path}.${index}`)
            )}
          </div>
        </div>
      );
    } else {
      const fieldConfig = getFieldConfig(path);
      const isEditing = fieldConfig.isEditing;
      
      // Auto-configure field type if not set
      if (!fieldConfigs[path]) {
        const detectedType = autoDetectFieldType(key, value);
        updateFieldConfig(path, { type: detectedType });
      }
      
      return (
        <div key={path} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">{key}</label>
            <div className="flex items-center gap-2">
              <Select
                value={fieldConfig.type}
                onValueChange={(newType: FieldViewerType) => updateFieldConfig(path, { type: newType })}
              >
                <SelectTrigger className="w-28 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="multiselect">Multi-select</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => toggleFieldEdit(path)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                {isEditing ? <Edit3 className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          
          {renderFieldContent(path, key, value, fieldConfig, isEditing)}
        </div>
      );
    }
  }, [handleFieldChange, getFieldConfig, fieldConfigs, autoDetectFieldType, updateFieldConfig, toggleFieldEdit]);

  const renderFieldContent = useCallback((path: string, key: string, value: any, config: FieldConfig, isEditing: boolean) => {
    if (!isEditing) {
      // View mode
      switch (config.type) {
        case 'markdown':
          return (
            <div 
              className="text-sm p-3 bg-gray-900/50 rounded border prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(String(value)) }}
            />
          );
        case 'multiselect':
          const selectedValues = Array.isArray(value) ? value : [value];
          return (
            <div className="text-sm p-3 bg-gray-900/50 rounded border">
              {selectedValues.map((item, idx) => (
                <span key={idx} className="inline-block bg-purple-600 text-white px-2 py-1 rounded text-xs mr-2 mb-1">
                  {String(item)}
                </span>
              ))}
            </div>
          );
        case 'boolean':
          return (
            <div className="text-sm p-3 bg-gray-900/50 rounded border">
              <span className={`px-2 py-1 rounded text-xs ${value ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                {String(value)}
              </span>
            </div>
          );
        default:
          return (
            <div className="text-sm p-3 bg-gray-900/50 rounded border">
              {String(value)}
            </div>
          );
      }
    } else {
      // Edit mode
      switch (config.type) {
        case 'textarea':
        case 'markdown':
          return (
            <Textarea
              value={String(value)}
              onChange={(e) => handleFieldChange(path, e.target.value)}
              className="text-sm resize-y"
              rows={Math.min(Math.max(3, String(value).split('\n').length + 1), 15)}
              style={{ minHeight: '120px' }}
            />
          );
        case 'multiselect':
          return (
            <div className="space-y-2">
              <Input
                value={Array.isArray(value) ? value.join(', ') : String(value)}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                  handleFieldChange(path, values);
                }}
                placeholder="Enter comma-separated values"
                className="text-sm"
              />
              {config.options && (
                <Select 
                  onValueChange={(selected) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (!currentValues.includes(selected)) {
                      handleFieldChange(path, [...currentValues, selected]);
                    }
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Add from predefined options..." />
                  </SelectTrigger>
                  <SelectContent>
                    {config.options.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        case 'boolean':
          return (
            <Select
              value={String(value)}
              onValueChange={(newValue) => handleFieldChange(path, newValue === 'true')}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
              </SelectContent>
            </Select>
          );
        case 'number':
          return (
            <Input
              type="number"
              value={String(value)}
              onChange={(e) => {
                const num = parseFloat(e.target.value);
                if (!isNaN(num)) {
                  handleFieldChange(path, num);
                }
              }}
              className="text-sm"
            />
          );
        default:
          return (
            <Input
              value={String(value)}
              onChange={(e) => handleFieldChange(path, e.target.value)}
              className="text-sm"
              style={{ 
                width: `${Math.max(200, String(value).length * 8 + 40)}px`,
                minWidth: '200px',
                maxWidth: '100%'
              }}
            />
          );
      }
    }
  }, [handleFieldChange, renderMarkdown]);

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Database className="h-16 w-16 mx-auto text-gray-500" />
          <h1 className="text-2xl font-bold text-white">Project Not Found</h1>
          <p className="text-gray-400">The requested cleaning project could not be found.</p>
          <Button onClick={() => router.push('/dataset-cleaner')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dataset Cleaner
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/dataset-cleaner')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Cleaner
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{currentProject.name}</h1>
              <p className="text-gray-400">
                Editing: {currentFile} ({currentFileIndex + 1} of {filteredFiles.length} {fileFilter !== 'all' ? `${fileFilter} ` : ''}files)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Output: {currentProject.outputPath} (Files saved directly to this directory)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Button
                variant={fileFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setFileFilter('all')}
                size="sm"
              >
                All ({currentProject.fileIndex.length})
              </Button>
              <Button
                variant={fileFilter === 'completed' ? 'default' : 'outline'}
                onClick={() => setFileFilter('completed')}
                size="sm"
              >
                Completed ({Object.values(currentProject.completedFiles || {}).filter(Boolean).length})
              </Button>
              <Button
                variant={fileFilter === 'incomplete' ? 'default' : 'outline'}
                onClick={() => setFileFilter('incomplete')}
                size="sm"
              >
                Incomplete ({currentProject.fileIndex.length - Object.values(currentProject.completedFiles || {}).filter(Boolean).length})
              </Button>
            </div>
            
            <div className="h-6 w-px bg-gray-600"></div>
            
            <Button
              variant={viewMode === 'tabular' ? 'default' : 'outline'}
              onClick={() => setViewMode('tabular')}
              size="sm"
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              Tabular
            </Button>
            <Button
              variant={viewMode === 'simple' ? 'default' : 'outline'}
              onClick={() => setViewMode('simple')}
              size="sm"
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Simple
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={saveCurrentFile}
                disabled={isSaving || autoSaveStatus === 'saving'}
                variant="outline"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Manual Save
              </Button>
              
              <div className="flex items-center gap-1 text-xs">
                {autoSaveStatus === 'saved' && (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-400" />
                    <span className="text-green-400">Auto-saved</span>
                  </>
                )}
                {autoSaveStatus === 'saving' && (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400" />
                    <span className="text-blue-400">Saving...</span>
                  </>
                )}
                {autoSaveStatus === 'error' && (
                  <>
                    <Circle className="h-3 w-3 text-red-400" />
                    <span className="text-red-400">Save failed</span>
                  </>
                )}
              </div>
            </div>
            
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Field Settings
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateFile('prev')}
                disabled={currentFileIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-400 px-3 py-1 bg-gray-800 rounded border border-gray-700">
                {currentFileIndex + 1} / {filteredFiles.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateFile('next')}
                disabled={currentFileIndex === filteredFiles.length - 1}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search for Issue */}
            <div className="flex items-center gap-2">
              <Input
                value={searchIssueNum}
                onChange={(e) => setSearchIssueNum(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Issue number..."
                className="w-40 text-sm"
              />
              <Button
                onClick={searchForIssue}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Find Issue
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <FileText className="h-4 w-4" />
                <span>{currentFile}</span>
                {currentProject.modifiedFiles[currentFile] && (
                  <span className="text-green-400 font-medium">• Modified</span>
                )}
              </div>
              
              <Button
                onClick={toggleFileCompletion}
                variant={currentProject.completedFiles?.[currentFile] ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                {currentProject.completedFiles?.[currentFile] ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    Mark Complete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Field Settings Panel */}
        {showSettings && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Field Configuration</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(fieldConfigs).map(([path, config]) => (
                <div key={path} className="p-3 bg-gray-900/50 rounded border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">{path}</span>
                    <Button
                      onClick={() => {
                        const newConfigs = { ...fieldConfigs };
                        delete newConfigs[path];
                        setFieldConfigs(newConfigs);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={config.type}
                      onValueChange={(newType: FieldViewerType) => updateFieldConfig(path, { type: newType })}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="multiselect">Multi-select</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                    {config.type === 'multiselect' && (
                      <Input
                        value={config.options?.join(', ') || ''}
                        onChange={(e) => {
                          const options = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                          updateFieldConfig(path, { options });
                        }}
                        placeholder="Option1, Option2, Option3..."
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Editor */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading file...</p>
            </div>
          ) : (
            <>
              {viewMode === 'simple' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Simple Editor</h3>
                  <Textarea
                    value={JSON.stringify(jsonData, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setJsonData(parsed);
                      } catch (error) {
                        // Invalid JSON, keep the text but don't update state
                        console.log('Invalid JSON');
                      }
                    }}
                    className="min-h-[500px] font-mono text-sm"
                    placeholder="JSON content..."
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Structured Editor</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(jsonData).map(([key, value]) => (
                      <div key={key} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        {renderJsonField(key, value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
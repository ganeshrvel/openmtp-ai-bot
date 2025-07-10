'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Folder, FolderOpen, Copy, Database, Eye, Filter, Check, X, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function DatasetCleanerPage() {
  const router = useRouter();
  const [projects, setProjects] = useLocalStorageState<CleaningProject[]>('cleaning-projects', {
    defaultValue: []
  });

  const [sourcePath, setSourcePath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSourcePathSelect = useCallback(() => {
    const userPath = prompt(
      'Enter the full path to the source directory containing JSON files:',
      '/Users/username/source-directory'
    );
    if (userPath && userPath.trim()) {
      setSourcePath(userPath.trim());
    }
  }, []);

  const handleOutputPathSelect = useCallback(() => {
    // Since output directory should be empty, we'll remove the browse button
    // and just use manual entry. User can create the directory structure manually
    const userPath = prompt(
      'Enter the full path for the output directory (will be created if it doesn\'t exist):',
      '/Users/username/cleaned-datasets/project1'
    );
    if (userPath && userPath.trim()) {
      setOutputPath(userPath.trim());
    }
  }, []);

  const createProject = useCallback(async () => {
    if (!sourcePath.trim() || !outputPath.trim()) return;

    setIsCreating(true);
    
    try {
      const projectId = Date.now().toString();
      const projectName = `Dataset Cleaning - ${sourcePath.split('/').pop()}`;
      
      // Call the API to create the project and copy files
      const response = await fetch('/api/dataset-cleaner/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath: sourcePath.trim(),
          outputPath: outputPath.trim(),
          projectName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Error: ${result.error}`);
        return;
      }

      if (!result.success) {
        alert(`Error: ${result.error || 'Unknown error'}`);
        return;
      }
      
      // Create project with the file index from API response
      const newProject: CleaningProject = {
        id: projectId,
        name: projectName,
        sourcePath: sourcePath.trim(),
        outputPath: outputPath.trim(),
        fileIndex: result.fileIndex,
        filePathMapping: result.filePathMapping,
        modifiedFiles: {},
        completedFiles: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setProjects(prev => [...prev, newProject]);
      
      alert(`Successfully copied ${result.copiedFiles} files to output directory!`);
      
      // Navigate to the cleaning interface
      router.push(`/dataset-cleaner/${projectId}`);
      
    } catch (error) {
      console.error('Error creating cleaning project:', error);
      alert('Failed to create project. Please check the console for details.');
    } finally {
      setIsCreating(false);
    }
  }, [sourcePath, outputPath, setProjects, router]);

  const deleteProject = useCallback((projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      // Remove project from projects list
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Remove project files from localStorage
      localStorage.removeItem(`cleaning-project-files-${projectId}`);
      
      console.log('Project deleted:', projectId);
    }
  }, [setProjects]);

  const filteredProjects = projects;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Dataset Cleaner</h1>
              <p className="text-gray-400">
                Process and edit JSON files from directories
              </p>
            </div>
          </div>

        </div>

        {/* Create New Project */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Create New Cleaning Project</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Directory */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Source Directory (with JSON files)</label>
                <div className="flex gap-2">
                  <Input
                    value={sourcePath}
                    onChange={(e) => setSourcePath(e.target.value)}
                    placeholder="e.g., /Users/username/source-directory"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSourcePathSelect}
                    variant="outline"
                    className="gap-2"
                    title="Enter path to source directory"
                  >
                    <Folder className="h-4 w-4" />
                    Set Path
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Directory containing JSON files to be cleaned and edited.
                </p>
              </div>

              {/* Output Directory */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Output Directory (Empty/New)</label>
                <div className="flex gap-2">
                  <Input
                    value={outputPath}
                    onChange={(e) => setOutputPath(e.target.value)}
                    placeholder="e.g., /Users/username/cleaned-datasets/project1"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleOutputPathSelect}
                    variant="outline"
                    className="gap-2"
                    title="Enter path for new directory"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Set Path
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Files will be copied from source to this directory. Directory will be created if it doesn't exist.
                </p>
              </div>
            </div>

            <Button
              onClick={createProject}
              disabled={!sourcePath.trim() || !outputPath.trim() || isCreating}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {isCreating ? 'Creating Project...' : 'Create Cleaning Project'}
            </Button>
          </div>
        </div>

        {/* Existing Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              All Projects ({filteredProjects.length})
            </h2>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-8 text-center">
              <Database className="h-16 w-16 mx-auto text-gray-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No projects found
              </h3>
              <p className="text-gray-400">
                Create your first cleaning project to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const completedFiles = Object.values(project.completedFiles || {}).filter(Boolean).length;
                const totalFiles = project.fileIndex.length;
                const progress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/dataset-cleaner/${project.id}`)}
                    className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-6 cursor-pointer hover:bg-gray-800/70 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {project.sourcePath}
                        </p>
                      </div>
                      <Button
                        onClick={(e) => deleteProject(project.id, e)}
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-900/50 hover:border-red-500"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white font-medium">
                          {completedFiles}/{totalFiles} files
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                        <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { sourcePath, outputPath, projectName } = await request.json();

    if (!sourcePath || !outputPath || !projectName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if source directory exists
    if (!await fs.pathExists(sourcePath)) {
      return NextResponse.json({ error: 'Source directory does not exist' }, { status: 400 });
    }

    // Create output directory if it doesn't exist
    await fs.ensureDir(outputPath);

    // Read all JSON files from source directory
    const files = await fs.readdir(sourcePath);
    const jsonFiles = files.filter(file => file.toLowerCase().endsWith('.json'));

    if (jsonFiles.length === 0) {
      return NextResponse.json({ error: 'No JSON files found in source directory' }, { status: 400 });
    }

    // Copy each JSON file to output directory
    const copiedFiles = [];
    for (const file of jsonFiles) {
      const sourcePath_file = path.join(sourcePath, file);
      const outputPath_file = path.join(outputPath, file);
      
      try {
        await fs.copy(sourcePath_file, outputPath_file);
        copiedFiles.push(file);
      } catch (error) {
        console.error(`Error copying ${file}:`, error);
      }
    }

    // Create file path mapping for better indexing
    const filePathMapping: { [filename: string]: { sourcePath: string; outputPath: string } } = {};
    for (const file of copiedFiles) {
      filePathMapping[file] = {
        sourcePath: path.join(sourcePath, file),
        outputPath: path.join(outputPath, file)
      };
    }

    return NextResponse.json({
      success: true,
      message: `Successfully copied ${copiedFiles.length} files`,
      fileIndex: copiedFiles,
      filePathMapping: filePathMapping,
      copiedFiles: copiedFiles.length,
      totalFiles: jsonFiles.length
    });

  } catch (error) {
    console.error('Error in create-project API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
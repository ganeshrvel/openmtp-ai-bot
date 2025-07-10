import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

// GET /api/dataset-cleaner/files?outputPath=xxx&filename=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outputPath = searchParams.get('outputPath');
    const filename = searchParams.get('filename');

    if (!outputPath || !filename) {
      return NextResponse.json({ error: 'Missing outputPath or filename' }, { status: 400 });
    }

    const filePath = path.join(outputPath, filename);

    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return NextResponse.json({ error: 'File does not exist' }, { status: 404 });
    }

    // Read and parse JSON file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      filename,
      data: jsonData
    });

  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ 
      error: 'Failed to read file', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// PUT /api/dataset-cleaner/files - Write file content
export async function PUT(request: NextRequest) {
  try {
    const { outputPath, filename, data } = await request.json();

    if (!outputPath || !filename || data === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const filePath = path.join(outputPath, filename);

    // Ensure the output directory exists
    await fs.ensureDir(path.dirname(filePath));

    // Write the JSON data to file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: `File ${filename} saved successfully`,
      filePath
    });

  } catch (error) {
    console.error('Error writing file:', error);
    return NextResponse.json({ 
      error: 'Failed to write file', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
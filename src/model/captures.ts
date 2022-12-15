import * as vscode from 'vscode';

export interface StackFrame {
    fileName: string
    function: string
    lineNumber: number
}

export interface CapturedObject {
    id: number,
    type: string,
    value?: string
    fields?: { [name:string]: number }
    elements?: number[]
    entries?: number[][]
}

export interface CapturedFrame {
    type: 'snapshot'
    locals: {[name:string]:number}
    watches: {[name:string]:number}
    objects: CapturedObject[]
    stack: StackFrame[]
    fid: number
    tid: number
    pid: number
}

const capturesFiles: {[path:string]: CapturedFrame[]} = {}

export async function parseCaptureFile(uri: vscode.Uri): Promise<CapturedFrame[]> {
    const raw = await vscode.workspace.fs.readFile(uri);
    const text = raw.toString();
    const lines = text.split(/\n/);
    return lines.map(line => {
        try {
            return JSON.parse(line);
        } catch {
            return null;
        }
    }).filter(capture => capture)
}


export async function loadCaptureFile(uri: vscode.Uri) {
    capturesFiles[uri.fsPath] = await parseCaptureFile(uri);
}

export function getAllCaptures(): CapturedFrame[] {
    return Object.values(capturesFiles).flatMap(x=>x);
}

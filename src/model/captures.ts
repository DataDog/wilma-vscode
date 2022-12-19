import * as vscode from 'vscode';

export interface StackFrame {
    fileName: string
    function: string
    lineNumber: number
}

export interface CapturedNode {
    id: string | number 
    type: string
    value?: string
    _event?: CapturedEvent
    size?: number

    isPrimitive(): boolean
    items(): { [key: string]: CapturedNode | undefined }
}

class MapEntry implements CapturedNode {
    keyObj: CapturedObject | undefined;
    valueObj: CapturedObject | undefined;

    constructor(
        public map: CapturedObject,
        public key: number,
        public val: number) {

        this.keyObj = this.map._event?.getObject(this.key)
        this.valueObj = this.map._event?.getObject(this.val)
    }

    get id() {
        return this.map.id * 13 ^ this.key;
    }

    get value() {
        return undefined;
    }

    get type() {
        return this.map.type + ".Entry"
    }

    get _event() {
        return this.map._event;
    }

    isPrimitive() {
        return false;
    }

    items() {
        return {
            "key": this.keyObj,
            "value": this.valueObj
        }
    }
}

export class CapturedObject implements CapturedNode {
    public _event?: CapturedEvent
    public frame?: CapturedStackFrame

    constructor(
        public id: number,
        public type: string,
        public value?: string,
        public fields?: { [name: string]: number },
        public elements?: number[],
        public entries?: number[][],
        public size?: number
    ) {
    }

    static fromObject(obj: Partial<CapturedObject>) {
        return new CapturedObject(
            obj.id || 0,
            obj.type || "",
            obj.value,
            obj.fields,
            obj.elements,
            obj.entries,
            obj.size)
    }

    isPrimitive() {
        return this.value !== undefined;
    }

    items() {
        let items: { [key: string]: CapturedNode | undefined } = {};
        if (this.fields) {
            for (let key in this.fields) {
                let obj = this._event?.getObject(this.fields[key]);
                items[key] = obj;
            }
        }
        if (this.elements) {
            this.elements.forEach((id, index) => {
                let obj = this._event?.getObject(id);
                items[`[${index}]`] = obj;
            });
        }

        if (this.entries) {
            this.entries.forEach((kv, index) => {
                let entry = new MapEntry(this, kv[0], kv[1]);
                if (entry.keyObj?.isPrimitive()) {
                    items[`[${entry.keyObj.value}]`] = entry.valueObj;
                } else {
                    items[`[${index}]`] = entry;
                }
            });
        }
        return items;
    }
}

export class CapturedStackFrame implements CapturedNode {
    public _event?: CapturedEvent

    constructor(
        public id: string | number,
        public type: 'frame',
        public locals: { [name: string]: number },
        public fileName: string,
        public functionName: string,
        public lineNumber: number) {
    }

    static fromObject(frame: Partial<CapturedStackFrame> | any) {
        return new CapturedStackFrame(
            frame.id || `${frame.fileName}:${frame.lineNumber}` || Math.random(),
            frame.type || "frame",
            frame.locals || {},
            frame.fileName,
            frame.functionName || frame.function,
            frame.lineNumber
        )
    }

    isPrimitive(): boolean {
        return Object.keys(this.locals).length === 0;
    }

    items(): { [key: string]: CapturedNode | undefined; } {
        let items: { [key: string]: CapturedNode | undefined } = {};
        for (let local in this.locals) {
            items[local] = this._event?.getObject(this.locals[local]);
        }
        return items;
    }
}

export class CapturedEvent implements CapturedNode {
    private objectMap = new Map<string | number, CapturedObject>();

    constructor(
        public id: string | number,
        public type: 'snapshot',
        public locals: { [name: string]: number },
        public watches: { [name: string]: number },
        public objects: CapturedObject[],
        public stack: CapturedStackFrame[],
        public fid: number,
        public tid: number,
        public pid: number) {
        for (let obj of this.objects) {
            this.objectMap.set(obj.id, obj);
            obj._event = this;
        }
        for (let stack of this.stack) {
            stack._event = this;
        }
    }

    static fromObject(frame: Partial<CapturedEvent>) {
        return new CapturedEvent(
            frame.id || Math.random(),
            frame.type || "snapshot",
            frame.locals || {},
            frame.watches || {},
            frame.objects?.map(obj => CapturedObject.fromObject(obj)) || [],
            frame.stack?.map(obj => CapturedStackFrame.fromObject(obj)) || [],
            frame.fid || 0,
            frame.tid || 0,
            frame.pid || 0)
    }

    getObject(id: string | number) {
        return this.objectMap.get(id);
    }

    isPrimitive(): boolean {
        return false;
    }

    get value() {
        return undefined;
    }

    get _event() {
        return this;
    }

    items() {
        let items: { [key: string]: CapturedNode | undefined } = {};
        for (let stack of this.stack) {
            items[stack.id as string] = stack;
        }
        for (let watch in this.watches) {
            items[watch] = this.getObject(this.watches[watch]);
        }
        return items;
    }
}

const capturesFiles: { [path: string]: CapturedEvent[] } = {}

export async function parseCaptureFile(uri: vscode.Uri): Promise<CapturedEvent[]> {
    const raw = await vscode.workspace.fs.readFile(uri);
    const text = raw.toString();
    const lines = text.split(/\n/);
    return lines.map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        })
        .filter(capture => capture)
        .map(capture => CapturedEvent.fromObject(capture));
}


export async function loadCaptureFile(uri: vscode.Uri) {
    capturesFiles[uri.fsPath] = await parseCaptureFile(uri);
}

export function getAllCaptures(): CapturedEvent[] {
    return Object.values(capturesFiles).flatMap(x => x);
}

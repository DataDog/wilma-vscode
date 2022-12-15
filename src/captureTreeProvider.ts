import * as vscode from 'vscode';
import { CapturedFrame, getAllCaptures, CapturedObject } from './model/captures';
import { relativePath } from './utils';


export class CaptureTreeProvider implements vscode.TreeDataProvider<CaptureNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<CaptureNode | undefined | void> = new vscode.EventEmitter<CaptureNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CaptureNode | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceUri: vscode.Uri | undefined) {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CaptureNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CaptureNode): Thenable<CaptureNode[]> {
        if (!this.workspaceUri) {
            vscode.window.showInformationMessage("Wilma: No workspace folder found");
            return Promise.resolve([]);
        }

        if (element !== undefined) {
            return Promise.resolve(element.getChildren());
        } else {
            return Promise.resolve(
                getAllCaptures().
                    map(capture => new CaptureNode(capture, vscode.TreeItemCollapsibleState.Collapsed))
            );
        }
    }
}


export class CaptureNode extends vscode.TreeItem {

    constructor(
        public readonly capture: CapturedFrame,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly objectId?: number,
        public readonly name?: string,
        public readonly command?: vscode.Command
    ) {
        super(objectId ? `${name}` : relativePath(vscode.Uri.file(capture.stack[0].fileName)), collapsibleState);
        // this.tooltip = `${}`;

        if (objectId) {
            let object = this.getObject(objectId);
            if (object) {
                if (object.value !== undefined) {
                    this.description = `${object.value}`;
                    this.tooltip = `${name}:${object.type} = ${object.value}` ;    
                } else {
                    this.description = `${object.type} @ ${object.id}`;
                    this.tooltip =  `${name} = ${object.type} @ ${object.id}`;
                }
            } else {
                this.description = 'not captured';
            }
        } else {
            this.description = `line ${capture.stack[0].lineNumber}`;
        }

        // if (this.probe) {
        //     this.iconPath = icons.logo;
        // } else {
        //     this.iconPath = vscode.ThemeIcon.File;
        //     this.resourceUri = vscode.Uri.parse("_.py");
        // }
    }

    getObject(objectId: number): CapturedObject | undefined  {
        if (!objectId) return undefined;
        let object = this.capture.objects.find(o => o.id === objectId);
        return object;
    }

    createNodeForObject(objectId:number, name: string) {
        let obj = this.getObject(objectId);
        let state = vscode.TreeItemCollapsibleState.Collapsed;
        if (!obj || obj.value !== undefined) {
            state = vscode.TreeItemCollapsibleState.None;
        } 
        return new CaptureNode(this.capture, state ,objectId, name);
    }

    getChildren(): CaptureNode[] {
        if (this.objectId) {
            let object = this.getObject(this.objectId)
            if (!object) {
                return [];
            }
            if (object.fields) {
                let fields = object.fields || {};
                return Object.keys(fields).map(name => {
                   return this.createNodeForObject(fields[name], name);
                })
            }
            if (object.elements) {
                let elements = object.elements || [];
                return elements.map((id,index) => {
                    return this.createNodeForObject(id, `[${index}]`);
                })
            }
            if (object.entries) {
                let entries = object.entries || [];
                return entries.map((kv,index) => {
                    let key = this.getObject(kv[0]);
                    let name =  `[${index}]`;
                    if (key && key.value !== undefined) {
                        name = `[${key.value}]`;
                    }
                    return this.createNodeForObject(kv[1], name);
                })
            }

            return [];
        } else {
            let children = [];
            for(let name in this.capture.locals) {
                let id =this.capture.locals[name];
                children.push(this.createNodeForObject(id,name));
            }
            for(let name in this.capture.watches) {
                let id =this.capture.watches[name];
                children.push(this.createNodeForObject(id,name));
            }
            return children;
        }
    }

    contextValue = 'capture';
}

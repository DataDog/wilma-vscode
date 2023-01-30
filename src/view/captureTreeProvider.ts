import { CapturedStackFrame } from './../model/captures';
import * as vscode from 'vscode';
import { CapturedNode, getAllCaptures, CapturedObject, CapturedEvent } from '../model/captures';
import { relativePath } from '../utils';


export class CaptureTreeProvider implements vscode.TreeDataProvider<CapturedEvent> {

    private _onDidChangeTreeData: vscode.EventEmitter<CapturedEvent | undefined | void> = new vscode.EventEmitter<CapturedEvent | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CapturedEvent | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceUri: vscode.Uri | undefined) {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CapturedEvent): vscode.TreeItem {
        return new CaptureTreeNode(element, vscode.TreeItemCollapsibleState.None, relativePath(vscode.Uri.file(element.stack[0].fileName)));
    }

    getChildren(element?: CapturedEvent): Thenable<CapturedEvent[]> {
        if (!this.workspaceUri) {
            vscode.window.showInformationMessage("Wilma: No workspace folder found");
            return Promise.resolve([]);
        }

        if (element !== undefined) {
            //return Promise.resolve(element.getChildren());
            return Promise.resolve([]);
        } else {
            return Promise.resolve(getAllCaptures());
        }
    }

    getParent(element: CapturedEvent): vscode.ProviderResult<CapturedEvent> {
        return Promise.resolve(undefined);
    }
}


export class StackTreeProvider implements vscode.TreeDataProvider<CaptureTreeNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<CaptureTreeNode | undefined | void> = new vscode.EventEmitter<CaptureTreeNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CaptureTreeNode | undefined | void> = this._onDidChangeTreeData.event;
    private frame: CapturedEvent | undefined;

    constructor(private workspaceUri: vscode.Uri | undefined) {
    }

    showCapture(frame: CapturedEvent) {
        this.frame = frame;
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CaptureTreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CaptureTreeNode): Thenable<CaptureTreeNode[]> {
        if (!this.workspaceUri) {
            vscode.window.showInformationMessage("Wilma: No workspace folder found");
            return Promise.resolve([]);
        }

        if (!this.frame) {
            return Promise.resolve([]);
        }

        if (element !== undefined) {
            return Promise.resolve(element.getChildren());
        } else {
            return Promise.resolve(
                Object.values(this.frame.items()).map(capture => new CaptureTreeNode(
                    capture, 
                    capture?.isPrimitive() ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded, 
                    relativePath(vscode.Uri.file(capture?.id as string))))
            ); 
        }
    }
}

const typedIcons: {[type:string]: vscode.ThemeIcon} = {
    "dict": new vscode.ThemeIcon("bracket"),
    "list": new vscode.ThemeIcon("symbol-array"),
    "set": new vscode.ThemeIcon("symbol-array"),
    "frozenset": new vscode.ThemeIcon("symbol-array"),
    "str": new vscode.ThemeIcon("symbol-text"),
    "int": new vscode.ThemeIcon("symbol-number"),
    "float": new vscode.ThemeIcon("symbol-number"),
    "long": new vscode.ThemeIcon("symbol-number"),
    "object": new vscode.ThemeIcon("symbol-constructor"),
}

export class CaptureTreeNode extends vscode.TreeItem {

    constructor(
        public readonly capture: CapturedNode | undefined,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly label: string,
        public readonly parent?: CaptureTreeNode,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        
        if (capture) {
            if (capture instanceof CapturedEvent) {
                this.description = `line ${capture.stack[0].lineNumber}`;
                this.iconPath = new vscode.ThemeIcon("symbol-variable")
            } else if (capture instanceof CapturedStackFrame) {
                this.label = capture.fileName.substring(capture.fileName.lastIndexOf('/') + 1);
                this.description = `line ${capture.lineNumber}`;
                this.iconPath = new vscode.ThemeIcon("symbol-variable")
            } else {
                if (capture.isPrimitive()) {
                    this.description = `${capture.value}`;
                    this.tooltip = `${label}:${capture.type} = ${capture.value}` ;    
                    this.iconPath = typedIcons[capture.type];
                } else if (capture.size !== undefined) {
                    this.description = `${capture.type}(size: ${capture.size}) @ ${capture.id}`;
                    this.tooltip =  `${label} = ${capture.type}(size: ${capture.size}) @ ${capture.id}`;
                    this.iconPath = typedIcons[capture.type];
                } else {
                    this.description = `${capture.type} @ ${capture.id}`;
                    this.tooltip =  `${label} = ${capture.type} @ ${capture.id}`;
                    this.iconPath = typedIcons['object'];
                }
            } 
        } else {
            this.description = 'not captured';
        }
    }

    getChildren(): CaptureTreeNode[] {
        let children = [];
        let items = this.capture?.items() || {};
        if (items) {
            for(let key in items) {
                let value = items[key];
                children.push(new CaptureTreeNode(value, value?.isPrimitive() ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed, key, this))
            }
        }
        return children;
    }

    contextValue = 'capture';
}

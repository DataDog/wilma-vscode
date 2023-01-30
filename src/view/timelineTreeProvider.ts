import * as vscode from 'vscode';
import { CapturedNode, getAllCaptures, CapturedObject, CapturedEvent } from '../model/captures';
import { relativePath } from '../utils';


export class TimelineTreeProvider implements vscode.TreeDataProvider<TimelineCaptureTreeNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<TimelineCaptureTreeNode | undefined | void> = new vscode.EventEmitter<TimelineCaptureTreeNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TimelineCaptureTreeNode | undefined | void> = this._onDidChangeTreeData.event;
    capture?: CapturedNode;

    constructor() {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    showTimeline(capture: CapturedNode | undefined) {
        this.capture = capture;
        this.refresh();
    }

    getTreeItem(element: TimelineCaptureTreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TimelineCaptureTreeNode): Thenable<TimelineCaptureTreeNode[]> {
        if (!this.capture) {
            return Promise.resolve([]);
        }

        if (element !== undefined) {
            return Promise.resolve(element.getChildren());
        } else {
            return Promise.resolve(
                getAllCaptures()
                .filter(c=>this.capture?.id && c.getObject(this.capture?.id))
                .map(capture => new TimelineCaptureTreeNode(capture, vscode.TreeItemCollapsibleState.Collapsed, relativePath(vscode.Uri.file(capture.stack[0].fileName))))
            );
        }
    }
}


export class TimelineCaptureTreeNode extends vscode.TreeItem {

    constructor(
        public readonly capture: CapturedNode | undefined,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly label: string,
        public readonly parent?: TimelineCaptureTreeNode,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        // this.tooltip = `${}`;

        if (capture) {
            if (capture instanceof CapturedEvent) {
                this.description = `line ${capture.stack[0].lineNumber}`;
            } else {
                if (capture.isPrimitive()) {
                    this.description = `${capture.value}`;
                    this.tooltip = `${label}:${capture.type} = ${capture.value}` ;    
                } else {
                    this.description = `${capture.type} @ ${capture.id}`;
                    this.tooltip =  `${label} = ${capture.type} @ ${capture.id}`;
                }
            } 
        } else {
            this.description = 'not captured';
        }

        // if (this.probe) {
        //     this.iconPath = icons.logo;
        // } else {
        //     this.iconPath = vscode.ThemeIcon.File;
        //     this.resourceUri = vscode.Uri.parse("_.py");
        // }
    }

    getChildren(): TimelineCaptureTreeNode[] {
        let children = [];
        let items = this.capture?.items() || {};
        if (items) {
            for(let key in items) {
                let value = items[key];
                children.push(new TimelineCaptureTreeNode(value, value?.isPrimitive() ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed, key, this))
            }
        }
        return children;
    }

    contextValue = 'capture';
}

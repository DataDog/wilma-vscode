import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getProbesDocuments, getProbesForDocument, onProbeChange, ProbeComment } from './model/probe';


export class ProbeTreeProvider implements vscode.TreeDataProvider<ProbeNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<ProbeNode | undefined | void> = new vscode.EventEmitter<ProbeNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ProbeNode | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceUri: vscode.Uri | undefined) {
        onProbeChange((action,probe) => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProbeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProbeNode): Thenable<ProbeNode[]> {
        if (!this.workspaceUri) {
            vscode.window.showInformationMessage("Wilma: No workspace folder found");
            return Promise.resolve([]);
        }

        if (element !== undefined) {
            return Promise.resolve(
                getProbesForDocument(element.uri).
                    map(comment => new ProbeNode(comment.parent.uri, vscode.TreeItemCollapsibleState.None, comment)));
        } else {
            return Promise.resolve(
                getProbesDocuments().
                    map(uri => new ProbeNode(uri, vscode.TreeItemCollapsibleState.Collapsed))
            );
        }
    }
}

export class ProbeNode extends vscode.TreeItem {

    constructor(
        public readonly uri: vscode.Uri,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly probe?: ProbeComment,
        public readonly command?: vscode.Command
    ) {
        super(probe !== undefined ? `${probe.file}:${probe.parent.range.start.line + 1}` : `${uri.path}`, collapsibleState);
        this.tooltip = probe?.body;
        this.description = probe?.body?.toString().split(/\n/)[0];

        if (this.probe) {
            this.iconPath = path.join(__filename, '..', '..', 'resources', 'logo.svg');
        } else {
            this.iconPath = vscode.ThemeIcon.File;
        }
    }

    contextValue = 'probe';
}

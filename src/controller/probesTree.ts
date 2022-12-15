import { CaptureNode } from './../captureTreeProvider';
import * as vscode from 'vscode';
import { CaptureTreeProvider } from '../captureTreeProvider';
import { loadCaptureFile } from '../model/captures';
import { ProbeNode, ProbeTreeProvider } from '../probeTreeProvider';

export function activateProbeTree(context: vscode.ExtensionContext): void {

    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage("Wilma: No workspace folder found");
        return;
    }

    const probeTreeProvider = new ProbeTreeProvider(vscode.workspace.workspaceFolders[0].uri);
    const treeView = vscode.window.createTreeView('wilma-probes', {
        treeDataProvider: probeTreeProvider
    });
    context.subscriptions.push(treeView);

    treeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<ProbeNode>) => {
        let probeNode = e.selection[0];
        if (!probeNode) {
            return;
        }
        vscode.workspace.openTextDocument(probeNode.uri).then(doc => {
            vscode.window.showTextDocument(doc);
            let range = probeNode.probe?.parent.range;
            if (range && vscode.window.activeTextEditor) {
                vscode.window.activeTextEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                vscode.window.activeTextEditor.selection = new vscode.Selection(range.start,range.start);
            }
        });
    });

    vscode.commands.registerCommand('wilma-probes.deleteEntry', (node: ProbeNode) => {
        if (node.probe) {
            vscode.commands.executeCommand("wilma-vscode.deleteNote", node.probe?.parent);
        }
    });


    let captureLogsPattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], '**/.wilma/captures.log');
    let watcher = vscode.workspace.createFileSystemWatcher(captureLogsPattern);
    context.subscriptions.push(watcher);

    const captureTreeProvider = new CaptureTreeProvider(vscode.workspace.workspaceFolders[0].uri);

    function loadAndUpdateCaptureFile(uri: vscode.Uri) {
        loadCaptureFile(uri).then(() => captureTreeProvider.refresh());
    }    

    watcher.onDidChange(loadAndUpdateCaptureFile);

    vscode.workspace.findFiles(captureLogsPattern).then(uris=>{
        uris.forEach(loadAndUpdateCaptureFile);
    });

    const captureTreeView = vscode.window.createTreeView('wilma-captures', {
        treeDataProvider: captureTreeProvider
    });
    context.subscriptions.push(captureTreeView);

    captureTreeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<CaptureNode>) => {
        let capture = e.selection[0];
        if (!capture) {
            return;
        }
        let location = capture.capture.stack[0];
        vscode.workspace.openTextDocument(vscode.Uri.file(location.fileName)).then(doc => {
            vscode.window.showTextDocument(doc);
            const range = new vscode.Range(new vscode.Position(location.lineNumber-1, 0),new vscode.Position(location.lineNumber, 0));
            if (vscode.window.activeTextEditor) {
                vscode.window.activeTextEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                vscode.window.activeTextEditor.selection = new vscode.Selection(range.start,range.start);
            }
        });
    });
}

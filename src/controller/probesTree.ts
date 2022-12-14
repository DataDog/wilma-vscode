import * as vscode from 'vscode';
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
            if (probeNode.probe?.parent.range) {
                vscode.window.activeTextEditor?.revealRange(probeNode.probe?.parent.range, vscode.TextEditorRevealType.InCenter);
            }
        });
    });

    vscode.commands.registerCommand('wilma-probes.deleteEntry', (node: ProbeNode) => {
        if (node.probe) {
            vscode.commands.executeCommand("wilma-vscode.deleteNote", node.probe?.parent);
        }
    });
}

import { CapturedEvent, CapturedStackFrame } from './../model/captures';
import { StackTreeProvider } from './../view/captureTreeProvider';
import { TimelineTreeProvider } from '../view/timelineTreeProvider';
import { CaptureTreeNode } from '../view/captureTreeProvider';
import * as vscode from 'vscode';
import { CaptureTreeProvider } from '../view/captureTreeProvider';
import { loadCaptureFile } from '../model/captures';
import { ProbeNode, ProbeTreeProvider } from '../view/probeTreeProvider';
import { activateTimelineView } from './timeline';

export function activateProbeTree(context: vscode.ExtensionContext): void {

    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage("Wilma: No workspace folder found");
        return;
    }

    const probeTreeProvider = new ProbeTreeProvider(vscode.workspace.workspaceFolders[0].uri);
    const probeTreeView = vscode.window.createTreeView('wilma-probes', {
        treeDataProvider: probeTreeProvider
    });
    context.subscriptions.push(probeTreeView);

    probeTreeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<ProbeNode>) => {
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
    const stackTreeProvider = new StackTreeProvider(vscode.workspace.workspaceFolders[0].uri);

    function loadAndUpdateCaptureFile(uri: vscode.Uri) {
        loadCaptureFile(uri).then(() => captureTreeProvider.refresh());
    }    

    watcher.onDidChange(loadAndUpdateCaptureFile);

    vscode.workspace.findFiles(captureLogsPattern).then(uris=>{
        uris.forEach(loadAndUpdateCaptureFile);
    });

    const capturesTreeView = vscode.window.createTreeView('wilma-captures', {
        treeDataProvider: captureTreeProvider
    });
    context.subscriptions.push(capturesTreeView);

    const timelineProvider = activateTimelineView(context);

    timelineProvider.onDidSelectionChanged((e: CapturedEvent | undefined | void) => {
        if (e) {
            capturesTreeView.reveal(e);
        }
    });

    capturesTreeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<CapturedEvent>) => {
        let capture = e.selection[0];
        if (!capture) {
            return;
        }
        stackTreeProvider.showCapture(capture);
        // let location = capture.capture?.frame?.stack[0];
        // if (!location) {
        //     return;
        // } 
        // openDocumentAtLocation(location.fileName, location.lineNumber);
        // timelineProvider.showTimeline(capture.capture);
    });

    function openDocumentAtLocation(fileName: string, lineNumber: number) {
        vscode.workspace.openTextDocument(vscode.Uri.file(fileName)).then(doc => {
            vscode.window.showTextDocument(doc).then(()=>{
                const range = new vscode.Range(new vscode.Position(lineNumber-1, 0),new vscode.Position(lineNumber, 0));
                if (vscode.window.activeTextEditor) {
                    vscode.window.activeTextEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    vscode.window.activeTextEditor.selection = new vscode.Selection(range.start,range.start);
                }
            })
        });
    }

    
    const stackTreeView = vscode.window.createTreeView('wilma-stack', {
        treeDataProvider: stackTreeProvider
    });
    context.subscriptions.push(stackTreeView);

    stackTreeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<CaptureTreeNode>) => {
        let capture: CaptureTreeNode | undefined = e.selection[0];
        if (capture) {
            let capturedValue = capture.capture;
            if (capturedValue?.isPrimitive()) {
                timelineProvider.showTimelineOfField(capture.parent?.capture, capture.label);    
            } else {
                timelineProvider.showTimeline(capture.capture);
            }
        }
        while (capture) {
            if (capture.capture instanceof CapturedStackFrame) {
                openDocumentAtLocation(capture.capture.fileName, capture.capture.lineNumber);
            }
            capture = capture.parent;
        }
    });
}

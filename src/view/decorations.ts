import * as vscode from 'vscode';
import { getProbesForDocument, ProbeComment } from '../model/probe';
import { icons } from '../resources';


let decorations: vscode.TextEditorDecorationType[] = [];


function clearDecorations() {
    decorations.forEach((ld) => ld.dispose());
    decorations = [];
}


export function updateDecorations(editor: vscode.TextEditor | undefined) {
    clearDecorations();

    if (editor !== undefined) {
        getProbesForDocument(editor.document.uri).forEach((probe) => {
            let iconDecoration = vscode.window.createTextEditorDecorationType({
                gutterIconPath: icons.logoPng,
                gutterIconSize: 'contain',
                overviewRulerColor: 'orange',
                overviewRulerLane: vscode.OverviewRulerLane.Left
            });
            let line = probe.parent.range.start.line;

            editor.setDecorations(iconDecoration, [new vscode.Range(
                editor.document.lineAt(line).range.start,
                editor.document.lineAt(line).range.end
            )]);

            decorations.push(iconDecoration);
        });
    }
}

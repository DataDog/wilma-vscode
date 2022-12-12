import * as vscode from 'vscode';

let assetUri = vscode.Uri.joinPath(vscode.extensions.getExtension('wilma-vscode.wilma-vscode')!.extensionUri, 'assets');

export let wilmaIconDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.joinPath(assetUri, 'wilma.png'),
    gutterIconSize: 'contain'
});

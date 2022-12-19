// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { activateProbeComments } from './controller/probes';
import { setResourceFromContext } from './resources';
import { updateDecorations } from './view/decorations';
import { showProbes } from './view/probes';
import { activateProbeTree } from './controller/probesTree';





// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	if (!vscode.workspace.workspaceFolders) {
		vscode.window.showErrorMessage("Wilma: No workspace folder found");
		return;
	}

	setResourceFromContext(context);
	activateProbeTree(context);

	let commentController = activateProbeComments(context);
	showProbes(vscode.workspace.workspaceFolders[0].uri, commentController).then(() => {
		updateDecorations(vscode.window.activeTextEditor);
	});

	vscode.window.registerWebviewViewProvider

	// TODO: Just for testing
	// let assetUri = vscode.Uri.joinPath(context.extensionUri, 'resources');

	vscode.window.onDidChangeActiveTextEditor(updateDecorations);
}

// This method is called when your extension is deactivated
export function deactivate() { }

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { activateProbeComments } from './controller/probes';
import { getResourcesUri } from './resources';
import { decorationHandler } from './view/decorations';
import { showProbes } from './view/probes';





// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	if (!vscode.workspace.workspaceFolders) {
		vscode.window.showErrorMessage("Wilma: No workspace folder found");
		return;
	}

	let resourcesUri = getResourcesUri(context);
	let updateDecorations = decorationHandler(resourcesUri);

	let commentController = activateProbeComments(context);
	showProbes(vscode.workspace.workspaceFolders[0].uri, commentController).then(() => {
		updateDecorations(vscode.window.activeTextEditor);
	});

	// TODO: Just for testing
	// let assetUri = vscode.Uri.joinPath(context.extensionUri, 'resources');

	vscode.window.onDidChangeActiveTextEditor(updateDecorations);
}

// This method is called when your extension is deactivated
export function deactivate() { }

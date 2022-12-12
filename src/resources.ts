import * as vscode from 'vscode';


export function getResourcesUri(context: vscode.ExtensionContext) {
    return vscode.Uri.joinPath(context.extensionUri, 'resources');
}

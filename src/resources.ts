import * as vscode from 'vscode';


export function getResourcesUri(context: vscode.ExtensionContext) {
    return vscode.Uri.joinPath(context.extensionUri, 'resources');
}

let resourceUri: vscode.Uri | undefined = undefined;

export function setResourceFromContext(context: vscode.ExtensionContext) {
    resourceUri = getResourcesUri(context);
}

export const icons = {
    get logo() {
        if (!resourceUri) {
            throw new Error("please call setResourceFromContext before result icon resources");
        }
        return vscode.Uri.joinPath(resourceUri, 'logo.svg');
    },
    get logoPng() {
        if (!resourceUri) {
            throw new Error("please call setResourceFromContext before result icon resources");
        }
        return vscode.Uri.joinPath(resourceUri, 'wilma.png');
    }
};

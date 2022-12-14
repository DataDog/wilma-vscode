
import { relative } from "path";
import * as vscode from "vscode";

export function relativePath(uri: vscode.Uri) {
    return vscode.workspace.workspaceFolders
                ? relative(vscode.workspace.workspaceFolders[0].uri.fsPath, uri.fsPath)
                : uri.fsPath
}

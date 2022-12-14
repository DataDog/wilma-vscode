import * as vscode from 'vscode';

import { createProbeComment, parseWilmaFile } from '../model/probe';


export function showProbes(workspaceUri: vscode.Uri, commentController: vscode.CommentController) {
    let wilmaFileUri = vscode.Uri.joinPath(workspaceUri, "wilma.toml");

    return {
        async then(callback: (data: any) => void) {
            let data = await parseWilmaFile(wilmaFileUri);
            let probes = data.probes;

            if (!probes) {
                return;
            }

            for (const [loc, expr] of Object.entries(probes)) {
                let [file, line] = loc.split(":");
                let lineno = parseInt(line);

                let thread = commentController.createCommentThread(
                    vscode.Uri.joinPath(workspaceUri, file),
                    new vscode.Range(lineno - 1, 0, lineno - 1, 0), []
                );
                thread.canReply = false;
                createProbeComment(thread, expr as string, file);
            }

            return callback(data);
        }
    };
}

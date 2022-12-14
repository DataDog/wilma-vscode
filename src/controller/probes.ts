import * as vscode from 'vscode';
import { relative } from 'path';

import { ProbeComment, createProbeComment, writeWilmaFile, deleteProbeComment } from '../model/probe';
import { decorationHandler } from '../view/decorations';
import { getResourcesUri } from '../resources';


export function activateProbeComments(context: vscode.ExtensionContext): vscode.CommentController {
    const commentController = vscode.comments.createCommentController('wilma-probes', 'Wilma Probes');
    context.subscriptions.push(commentController);

    function update() {
        writeWilmaFile();
        decorationHandler(getResourcesUri(context))(vscode.window.activeTextEditor);
    }

    commentController.commentingRangeProvider = {
        provideCommentingRanges: (document: vscode.TextDocument, token: vscode.CancellationToken) => {
            let lineCount = document.lineCount;
            return [new vscode.Range(0, 0, lineCount - 1, 0)];
        }
    };
    commentController.options = {
        prompt: 'Inject Python code',
        placeHolder: 'Type the Python code to inject'
    };

    context.subscriptions.push(vscode.commands.registerCommand('wilma-vscode.createNote', (reply: vscode.CommentReply) => {
        submitProbeComment(reply);

        update();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wilma-vscode.deleteNoteComment', (comment: ProbeComment) => {
        let thread = comment.parent;
        if (!thread) {
            return;
        }

        thread.comments = thread.comments.filter(cmt => (cmt as ProbeComment).id !== comment.id);

        if (thread.comments.length === 0) {
            thread.dispose();
        }

        deleteProbeComment(comment);

        update();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wilma-vscode.deleteNote', (thread: vscode.CommentThread) => {
        for (let comment of thread.comments) {
            deleteProbeComment(comment as ProbeComment);
        }

        update();

        thread.dispose();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wilma-vscode.cancelsaveNote', (comment: ProbeComment) => {
        if (!comment.parent) {
            return;
        }

        comment.parent.comments = comment.parent.comments.map(cmt => {
            if ((cmt as ProbeComment).id === comment.id) {
                cmt.mode = vscode.CommentMode.Preview;
            }

            return cmt;
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wilma-vscode.saveNote', (comment: ProbeComment) => {
        if (!comment.parent) {
            return;
        }

        comment.expression = comment.body as string;
        comment.body = comment.wrappedExpression();

        comment.parent.comments = comment.parent.comments.map(cmt => {
            if ((cmt as ProbeComment).id === comment.id) {
                cmt.mode = vscode.CommentMode.Preview;
            }

            return cmt;
        });

        update();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wilma-vscode.editNote', (comment: ProbeComment) => {
        if (!comment.parent) {
            return;
        }

        comment.body = comment.expression;

        comment.parent.comments = comment.parent.comments.map(cmt => {
            if ((cmt as ProbeComment).id === comment.id) {
                cmt.mode = vscode.CommentMode.Editing;
            }

            return cmt;
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand('wilma-vscode.dispose', () => {
        commentController.dispose();
    }));

    function submitProbeComment(reply: vscode.CommentReply) {
        createProbeComment(
            reply.thread,
            reply.text,
            vscode.workspace.workspaceFolders
                ? relative(vscode.workspace.workspaceFolders[0].uri.fsPath, reply.thread.uri.fsPath)
                : reply.thread.uri.fsPath
        );
    }

    return commentController;
}

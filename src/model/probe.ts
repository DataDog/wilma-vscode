import * as vscode from 'vscode';
import { parse, stringify } from '@iarna/toml';

let commentId = 1;
let comments = new Map<number, ProbeComment>();


export class ProbeComment implements vscode.Comment {
    id: number;
    label: string | undefined;
    body: vscode.MarkdownString | string;

    constructor(
        public expression: string,
        public mode: vscode.CommentMode,
        public author: vscode.CommentAuthorInformation,
        public file: string,
        public parent: vscode.CommentThread,
        public contextValue?: string
    ) {
        this.id = ++commentId; // TODO: Make this `${file}:${parent.range.start.line}`
        this.body = this.wrappedExpression();
    }

    public wrappedExpression(): vscode.MarkdownString {
        return new vscode.MarkdownString(`~~~py\n${this.expression}\n~~~`);
    }
}


export function createProbeComment(thread: vscode.CommentThread, text: string, file: string) {
    let newComment = new ProbeComment(
        text.trim(),
        vscode.CommentMode.Preview,
        { name: 'Wilma' },
        file,
        thread,
        thread.comments.length ? 'canDelete' : undefined
    );

    comments.set(newComment.id, newComment);

    thread.comments = [...thread.comments, newComment];

    // We can only have one probe per line so don't allow adding replies
    thread.canReply = false;
}


export function deleteProbeComment(comment: ProbeComment) {
    comments.delete(comment.id);
}


export function parseWilmaFile(uri: vscode.Uri) {
    return {
        async then(callback: (data: any) => void) {
            const raw = await vscode.workspace.fs.readFile(uri);
            return callback(parse(raw.toString()));
        }
    };
}


export function getProbesForDocument(uri: vscode.Uri) {
    return Array.from(comments.values()).filter((comment) => comment.parent.uri.fsPath === uri.fsPath);
}


export function writeWilmaFile() {
    if (!vscode.workspace.workspaceFolders) {
        return;
    }
    let workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    let wilmaFileUri = vscode.Uri.joinPath(workspaceUri, "wilma.toml");

    parseWilmaFile(wilmaFileUri).then((data: any) => {
        data.probes = Object.fromEntries(
            new Map(
                Array.from(
                    comments,
                    ([_, probe]) => [`${probe.file}:${probe.parent.range.start.line + 1}`, probe.expression + "\n"]
                )
            )
        );
        vscode.workspace.fs.writeFile(wilmaFileUri, Buffer.from(stringify(data)));
    });
}

import * as vscode from 'vscode';
import { parse, stringify } from '@iarna/toml';

export enum ProbeCommentAction {
    Create = 0,
    Update = 1,
    Remove = 2
}

type CommentProbeChangesCallback = (action: ProbeCommentAction, probe: ProbeComment) => void;

let commentId = 1;
const comments = new Map<number, ProbeComment>();
const commentsChanges: CommentProbeChangesCallback[] = [];


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
        this.id = ++commentId; // TODO: Make this `${file}:${linenum}`
        this.body = this.wrappedExpression();
    }

    public wrappedExpression(): vscode.MarkdownString {
        return new vscode.MarkdownString(`~~~py\n${this.expression}\n~~~`);
    }

    get linenum() {
        return this.parent.range.start.line + 1;
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

    notifyProbeChange(ProbeCommentAction.Create, newComment);

    thread.comments = [...thread.comments, newComment];

    // We can only have one probe per line so don't allow adding replies
    thread.canReply = false;
}


export function deleteProbeComment(comment: ProbeComment) {
    comments.delete(comment.id);

    notifyProbeChange(ProbeCommentAction.Remove, comment);
}


export function parseWilmaFile(uri: vscode.Uri) {
    return {
        async then(callback: (data: any) => void) {
            const raw = await vscode.workspace.fs.readFile(uri);
            return callback(parse(raw.toString()));
        }
    };
}


export function getProbesDocuments(): vscode.Uri[] {
    let allUris = new Map<string, vscode.Uri>();

    for (let uri of Array.from(comments.values()).map(comment => comment.parent.uri)) {
        if (!(uri.fsPath in allUris)) {
            allUris.set(uri.fsPath, uri);
        }
    }
    return Array.from(allUris.values());
}

export function getProbesForDocument(uri: vscode.Uri): ProbeComment[] {
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
                    ([_, probe]) => [`${probe.file}:${probe.linenum}`, probe.expression + "\n"]
                )
            )
        );
        vscode.workspace.fs.writeFile(wilmaFileUri, Buffer.from(stringify(data)));
    });
}

export function onProbeChange(callback: CommentProbeChangesCallback) {
    commentsChanges.push(callback);
}

export function notifyProbeChange(action: ProbeCommentAction, probe: ProbeComment) {
    commentsChanges.forEach(callback => callback(action, probe));
}

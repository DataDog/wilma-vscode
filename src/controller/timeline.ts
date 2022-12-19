import * as vscode from 'vscode';
import { CapturedEvent, CapturedNode, getAllCaptures } from '../model/captures';
import { relativePath } from '../utils';

export function activateTimelineView(context: vscode.ExtensionContext) {

	const provider = new TimelineViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(TimelineViewProvider.viewType, provider));

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('calicoColors.addColor', () => {
	// 		provider.addColor();
	// 	}));

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('calicoColors.clearColors', () => {
	// 		provider.clearColors();
	// 	}));

    return provider;
}

class TimelineViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'wilma-timeline';

	private _onDidSelectionChanged: vscode.EventEmitter<CapturedEvent | undefined | void> = new vscode.EventEmitter<CapturedEvent | undefined | void>();
    readonly onDidSelectionChanged: vscode.Event<CapturedEvent | undefined | void> = this._onDidSelectionChanged.event;


	private _view?: vscode.WebviewView;
    capture: CapturedNode | undefined;
	timelineTitle?: string;
    timeline?: CapturedNode[];
	fieldTimeline?: CapturedNode[];

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'frameSelected':
					{
                        let capture = this.timeline?.find(e=>e._event?.id == data.value);
                        if (capture) {
                            let location = capture._event?.stack[0];
                            if (!location) {
                                return;
                            } 
                            openDocumentAtLocation(location.fileName, location.lineNumber);
							this._onDidSelectionChanged.fire(capture._event);
                        }
						break;
					}
			}
		});

        function openDocumentAtLocation(fileName: string, lineNumber: number) {
            vscode.workspace.openTextDocument(vscode.Uri.file(fileName)).then(doc => {
                vscode.window.showTextDocument(doc);
                const range = new vscode.Range(new vscode.Position(lineNumber-1, 0),new vscode.Position(lineNumber, 0));
                if (vscode.window.activeTextEditor) {
                    vscode.window.activeTextEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    vscode.window.activeTextEditor.selection = new vscode.Selection(range.start,range.start);
                }
            });
        }
	}

    
    showTimeline(capture: CapturedNode | undefined) {
        this.capture = capture;
        this.timeline = [];
        if (capture) {
            this.timeline = getAllCaptures().map(c=>c.getObject(capture.id)).filter(c=>c) as CapturedNode[];
        }

        let events = this.timeline.map(node=>{
            let frame = node._event?.stack[0];
            return {
                frame: node._event?.id,
                current: capture?._event === node._event,
                fileName: relativePath(vscode.Uri.file(frame?.fileName || "")),
                lineNumber: frame?.lineNumber,
                value: node.isPrimitive() ? node.value : `${node.type} @ ${node.id}`
            }
        });

        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ type: 'setTimeline', events: events, title: "Obj" });   
        }
    }

	showTimelineOfField(capture: CapturedNode | undefined, field: string) {
        this.capture = capture;
		this.timeline = [];
		this.fieldTimeline = [];
		this.timelineTitle = "";
        if (capture) {
            this.timeline = getAllCaptures().map(c=>c.getObject(capture.id)).filter(c=>c) as CapturedNode[];
			this.fieldTimeline = this.timeline.map(c=>c.items()[field]) as CapturedNode[];
			this.timelineTitle = capture.isPrimitive() ? capture.value : `${capture.type} @ ${capture.id}`;
        }

		let events = this.fieldTimeline.map(node=>{
            let frame = node._event?.stack[0];
            return {
                frame: node._event?.id,
                current: capture?._event === node._event,
                fileName: relativePath(vscode.Uri.file(frame?.fileName || "")),
                lineNumber: frame?.lineNumber,
                value: node.isPrimitive() ? node.value : `${node.type} @ ${node.id}`
            }
        });

        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ type: 'setTimeline', events: events, title: this.timelineTitle });   
        }
    }

	public addColor() {
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: 'addColor' });
		}
	}

	public clearColors() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearColors' });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<title>Cat Colors</title>
			</head>
			<body>
                <div class="obj" id="obj">Obj</div>
                <ul class="timeline-list"></ul>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

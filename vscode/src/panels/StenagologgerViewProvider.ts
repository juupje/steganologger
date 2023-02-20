import * as vscode from 'vscode';

export class SteganologgerViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'steganologger.webview';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri:vscode.Uri,
		private readonly _logger:vscode.OutputChannel,
		private readonly _context:vscode.ExtensionContext
	) {
		this._logger.appendLine("constructing webview");
	}

	public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>,
		token: vscode.CancellationToken): void | Thenable<void> {
		this._logger.appendLine("Resolving webview");
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};
		webviewView.webview.html = this._getHTMLForWebview(webviewView.webview);
	}

	public addJSON(json:JSON, name:string) {
		if(this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({type: 'addJSON', json: json, name: name});
		}
	}

	public clear() {
		if(this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({type: "clear"});
		}
	}

	public removeTab() {
		if(this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({type: "removeTab"});
		}
	}

	private _getHTMLForWebview(webview: vscode.Webview) {
		
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js'));
		const nonce = getNonce();
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset='UTF-8'>
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
				<title>Steganologger</title>
			</head>
			<body>
				<div class="tabs" id="tabcontainer">
					<pre id='json'>Nothing here yet.</pre>
				</div>
			<script nonce="${nonce}" type="module" src="${scriptUri}"></script>
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
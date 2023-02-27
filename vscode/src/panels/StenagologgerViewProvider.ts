import * as vscode from 'vscode';

export class SteganologgerViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'steganologger.webview';

	private _view?: vscode.WebviewView;
	private _compareModeActive:boolean;

	constructor(
		private readonly _extensionUri:vscode.Uri,
		private readonly _logger:vscode.OutputChannel,
		private readonly _context:vscode.ExtensionContext
	) {
		this._logger.appendLine("constructing webview");
		this._compareModeActive = false;
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
		webviewView.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'refreshTab':	
						this._logger.appendLine("Refreshing: '" + message.file + "'")
						vscode.commands.executeCommand("steganologger.showInfo", vscode.Uri.file(message.file));
						break;
					case 'error':
						vscode.window.showErrorMessage(message.message);
						break;
				}
			},
			undefined,
			this._context.subscriptions
		  );
	}

	public addJSON(json:JSON, name:string) {
		if(this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({type: 'addJSON', json: json, name: name});
		}
	}

	public command(command:string) {
		if(this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({type: command});
		}
	}

	public toggleCompare() {
		if(this._view) {
			this._view.show?.(true);
			this._compareModeActive = !this._compareModeActive;
			this._view.webview.html = this._getHTMLForWebview(this._view.webview);
		}
	}

	private _getHTMLForWebview(webview: vscode.Webview) {
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media','style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', this._compareModeActive ? 'webview-compare.js' : 'webview.js'));
		const nonce = getNonce();
		if(this._compareModeActive) {
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
					<div class='container'><p id='button_p'><vscode-button id='comparebtn'>Compare!</vscode-button></p>
						<table id='compare_table'>
							<tr><th><p>File:</p><vscode-dropdown name='dd_left' class='dropdown' id='dropdown_left'></vscode-dropdown></th>
							<th><p>File:</p><vscode-dropdown name='dd_right' class='dropdown' id='dropdown_right'></vscode-dropdown></th></tr>
							<tr><td id='file_left' class='col_left'></td><td id='file_right' class='col_right'></td></tr>
							<tr><td id='json_left' class='col_left'>Nothing to show here...</td><td id='json_right' class='col_right'>...nor here</td></tr>
						</table>
					</div>
				<script nonce="${nonce}" type="module" src="${scriptUri}"></script>
				</body>
				</html>`;
		} else {
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
					<div class="tabs container" id="tabcontainer">
						<pre id='json'>Nothing here yet.</pre>
					</div>
				<script nonce="${nonce}" type="module" src="${scriptUri}"></script>
				</body>
				</html>`;
		}
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
const vscode = require('vscode');
const path = require('path');

function activate(context) {
  const disposable = vscode.commands.registerCommand('teal.downloadFile', async (uri) => {
    // If not triggered directly from explorer context, use active editor document
    if (!uri && vscode.window.activeTextEditor) {
      uri = vscode.window.activeTextEditor.document.uri;
    }
    if (!uri || !uri.fsPath) {
      vscode.window.showWarningMessage('No file selected to download.');
      return;
    }

    const fsPath = uri.fsPath;
    const studentHome = '/home/student';
    let relPath = path.relative(studentHome, fsPath);
    relPath = relPath.split(path.sep).join('/');

    if (relPath.startsWith('..')) {
      vscode.window.showErrorMessage('Cannot download files outside /home/student');
      return;
    }

    try {
      const port = process.env.PORT || 8080;
      const downloadPath = `/__teal/files/${encodeURI(relPath)}`;
      const localGatewayUri = vscode.Uri.parse(`http://127.0.0.1:${port}${downloadPath}`);
      const externalUri = await vscode.env.asExternalUri(localGatewayUri);
      await vscode.env.openExternal(externalUri);
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to download file: ${err.message || err}`);
    }
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};

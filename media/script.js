(function() {
    const vscode = acquireVsCodeApi();
    const oldState = vscode.getState() || {json:null};
    setJSON(oldState.json);

    window.addEventListener('message', event => {
        const message = event.data;
        switch(message.type) {
            case 'setJSON': {
                setJSON(message.json);
                break;
            }
        }
    });

    function setJSON(json) {
        if(json === null) {
            document.getElementById('json').innerHTML = "Nothing here yet";
            vscode.setState({json:null});
            return;
        }
        if (typeof json !== 'string') {
            json = stringify(json);
        }
        document.getElementById('json').innerHTML = syntaxHighlight(json);
        vscode.setState({json:json});
    }

    function syntaxHighlight(json) {
		json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		highlighted = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
			var cls = 'number';
			if (/^"/.test(match)) {
				if (/:$/.test(match)) {
					cls = 'key';
				} else {
					cls = 'string';
				}
			} else if (/true|false/.test(match)) {
				cls = 'boolean';
			} else if (/null/.test(match)) {
				cls = 'null';
			}
			return '<span class="' + cls + '">' + match + '</span>';
		});
        return highlighted.replaceAll("\n", "<br/>");
	}
}());

/*
The code below is taken from the json-stringify-pretty-compact package.
See https://www.npmjs.com/package/json-stringify-pretty-compact
*/
const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g;

function stringify(passedObj, options = {}) {
  const indent = JSON.stringify(
    [1],
    undefined,
    options.indent === undefined ? 2 : options.indent
  ).slice(2, -3);

  const maxLength =
    indent === ""
      ? Infinity
      : options.maxLength === undefined
      ? 80
      : options.maxLength;

  let { replacer } = options;

  return (function _stringify(obj, currentIndent, reserved) {
    if (obj && typeof obj.toJSON === "function") {
      obj = obj.toJSON();
    }

    const string = JSON.stringify(obj, replacer);

    if (string === undefined) {
      return string;
    }

    const length = maxLength - currentIndent.length - reserved;

    if (string.length <= length) {
      const prettified = string.replace(
        stringOrChar,
        (match, stringLiteral) => {
          return stringLiteral || `${match} `;
        }
      );
      if (prettified.length <= length) {
        return prettified;
      }
    }

    if (replacer !== null) {
      obj = JSON.parse(string);
      replacer = undefined;
    }

    if (typeof obj === "object" && obj !== null) {
      const nextIndent = currentIndent + indent;
      const items = [];
      let index = 0;
      let start;
      let end;

      if (Array.isArray(obj)) {
        start = "[";
        end = "]";
        const { length } = obj;
        for (; index < length; index++) {
          items.push(
            _stringify(obj[index], nextIndent, index === length - 1 ? 0 : 1) ||
              "null"
          );
        }
      } else {
        start = "{";
        end = "}";
        const keys = Object.keys(obj);
        const { length } = keys;
        for (; index < length; index++) {
          const key = keys[index];
          const keyPart = `${JSON.stringify(key)}: `;
          const value = _stringify(
            obj[key],
            nextIndent,
            keyPart.length + (index === length - 1 ? 0 : 1)
          );
          if (value !== undefined) {
            items.push(keyPart + value);
          }
        }
      }

      if (items.length > 0) {
        return [start, indent + items.join(`,\n${nextIndent}`), end].join(
          `\n${currentIndent}`
        );
      }
    }

    return string;
  })(passedObj, "", 0);
}
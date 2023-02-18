const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g;
(function() {
  const vscode = acquireVsCodeApi();
  const oldState = vscode.getState() || {jsons: [], names: [], current: null};
  
  var counter = 1;
  var jsons = oldState.jsons;
  var names = oldState.names;
  var current = oldState.current;
  
  for(var i = 0; i < jsons.length; i++) {
    addJSON(jsons[i], names[i]);
  }

  window.addEventListener('message', event => {
    const message = event.data;
    switch(message.type) {
      case 'addJSON': {
        let idx = checkIfAlreadyAdded(message.name);
        if(idx > 0) {
          //Already in the list
          current = "tabs"+idx;
          document.getElementById("tabs"+idx).checked=true;
          updateState();
        } else {
          current = "tabs" + counter; //this will be selected by addJSON()
          addJSON(message.json, message.name);
          jsons.push(message.json);
          names.push(message.name);
          updateState();
        }
        break;
      }
    }
  });

  function addJSON(json, name) {
    if(counter==1) {
      clear();
    }
    if (typeof json !== 'string') {
      json = stringify(json);
    }
    let str = syntaxHighlight(json);
    let input = document.createElement("input");
    input.type = "radio";
    input.name = "tabs";
    input.id = "tab" + counter;
    input.value = "tab" + counter;
    if(input.id === current) {
      input.checked = true;
    }
    input.onclick = onTabClick;
    let label = document.createElement("label");
    label.htmlFor = "tab"+counter;
    label.innerHTML = name.substring(name.lastIndexOf("/")+1);
    let div = document.createElement("div");
    div.classList = "tab tabcontent";
    div.innerHTML = "<pre class='json'>File: "+ name + "<br/>" + str + "</pre>";
    let tabs = document.getElementById("tabcontainer");
    tabs.appendChild(input);
    tabs.appendChild(label);
    tabs.appendChild(div);
    counter += 1;
  }

  function checkIfAlreadyAdded(name) {
    for(let i = 0; i < names.length; i++) {
      if(names[i]===name){
        return i;
      }
    }
    return -1;
  }

  function onTabClick() {
    current = document.querySelector('input[name="tabs"]:checked').value;
    updateState();
  }

  function updateState() {
    vscode.setState({jsons:jsons, names:names, current: current});
  }

  function clear() {
    let tabs = document.getElementById("tabcontainer");
    tabs.innerHTML = "";
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

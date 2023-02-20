import { provideVSCodeDesignSystem, vsCodeButton } from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(vsCodeButton());

declare var acquireVsCodeApi: any;

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
          let element = document.getElementById("tabs"+idx) as HTMLInputElement;
          if(element !== null) {
            element.checked = true;
          }
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
      case 'clear': {
        names = [];
        jsons = [];
        current = null;
        updateState();
        counter = 1;
        let tabs = document.getElementById("tabcontainer") as HTMLDivElement;
        tabs.innerHTML = "<pre id='json'>Nothing here yet.</pre>";
        break;
      }
      case 'removeTab': {
        console.log("Current: " + current);
        let currentLabel = document.getElementById("label" + current);
        let name = currentLabel?.innerHTML;
        let idx = 0;
        for(; idx < names.length; idx++) {
          if(names[idx].endsWith(name)) { break; }
        }
        console.log("Removing name " + names[idx] + " at idx " + idx);
        if(idx==0) {
          names = names.slice(1);
          jsons = jsons.slice(1);
        } else if(idx==names.length-1) {
          names = names.slice(0,-1);
          jsons = jsons.slice(0,-1);
        } else {
          names = names.slice(0,idx).concat(names.slice(idx+1));
          jsons = jsons.slice(0,idx).concat(jsons.slice(idx+1));
        }
        //Remove the input, label and content
        document.getElementById("tab"+current)?.remove()
        document.getElementById("label"+current)?.remove();
        document.getElementById("tabcontent"+current)?.remove();
        if(names.length==0) {
          let tabs = document.getElementById("tabcontainer") as HTMLDivElement;
          tabs.innerHTML = "<pre id='json'>Nothing here yet.</pre>";
          current = null;
        } else {
          let inputs = document.getElementsByClassName("tabinput");
          let input = inputs[0] as HTMLInputElement;
          for(let i = 1; i < inputs.length; i++) {
            input = inputs[i] as HTMLInputElement;
          }
          if(Math.abs(Number(input.value)-current)===1) {
            current = input.value;
            input.checked = true;
          }
        }
        updateState();
        break;
      } 
    }
  });

  function addJSON(json:string|{[key:string]:any}, name:string) {
    if(counter==1) {
      clearPanel();
    }
    if (typeof json !== 'string') {
      json = stringify(json);
    }
    let str = syntaxHighlight(json);
    let input = document.createElement("input");
    input.type = "radio";
    input.className = "tabinput";
    input.name = "tabs";
    input.id = "tab" + counter;
    input.value = ""+counter;
    if(input.id === current) {
      input.checked = true;
    }
    input.onclick = onTabClick;
    let label = document.createElement("label");
    label.id = "label" + counter;
    label.htmlFor = "tab"+counter;
    label.innerHTML = name.substring(name.lastIndexOf("/")+1);
    let div = document.createElement("div") as HTMLDivElement;
    div.id = "tabcontent" + counter;
    div.classList.add("tab", "tabcontent");
    div.innerHTML = "<pre class='json'>File: "+ name + "<br/>" + str + "</pre>";
    let tabs = document.getElementById("tabcontainer");
    tabs?.appendChild(input);
    tabs?.appendChild(label);
    tabs?.appendChild(div);
    console.log("Added tab" + counter);
    counter += 1;
  }

  function checkIfAlreadyAdded(name:string) {
    for(let i = 0; i < names.length; i++) {
      if(names[i]===name){
        return i;
      }
    }
    return -1;
  }

  function onTabClick() {
    let element = document.querySelector('input[name="tabs"]:checked') as HTMLInputElement;
    current = element.value;
    updateState();
  }

  function updateState() {
    vscode.setState({jsons:jsons, names:names, current: current});
  }

  function clearPanel() {
    let tabs = document.getElementById("tabcontainer") as HTMLDivElement;
    tabs.innerHTML = "";
  }
  
  function syntaxHighlight(json:string) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let highlighted = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
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

function stringify(passedObj:{}, options:any = {}) {
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

  return (function _stringify(obj:any, currentIndent, reserved):string {
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

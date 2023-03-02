const YAML = require('js-yaml');

const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g;
export function syntaxHighlight(str) {
  str = safe_tags(str);
  let highlighted = str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|'(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\'])*'(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    var cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key';
      } else {
        cls = 'string';
      }
    } else if (/^'/.test(match)) {
      cls = 'string';
    } else if (/true|false/.test(match)) {
      cls = 'boolean';
    } else if (/null/.test(match)) {
      cls = 'null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
  return highlighted.replaceAll("\n", "<br/>");
}

export function jsonToString(json, options = {}) {
  return (typeof json === 'string' ? json : stringify(json, options));
}

export function yamlToString(docs, options = {}) {
  return (typeof docs === 'string' ? docs : YAML.dump(docs, options));
}

export function safe_tags(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
}

/*
The code below is taken from the json-stringify-pretty-compact package.
See https://www.npmjs.com/package/json-stringify-pretty-compact
*/

function stringify(passedObj, options={}) {
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
  
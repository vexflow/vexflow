let codeArray;

function showCode(...c) {
  codeArray = c;

  for (let i = 0; i < c.length; i++) {
    document.getElementById('code' + i).innerText = c[i];
  }
}

function copyCode(index) {
  navigator.clipboard.writeText(codeArray[index]);
}

function runCode(index) {
  eval('"use strict";' + codeArray[index]);
}

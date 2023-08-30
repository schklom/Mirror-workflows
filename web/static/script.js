// @license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-3.0
// this code submits the translation form when pressing Ctrl/Meta+Enter while focussed on the input text field
document.getElementById("input").addEventListener("keydown", function (event) {
    if (event.keyCode === 13 && (event.metaKey || event.ctrlKey)) {
        document.getElementById("translation-form").submit();
    }
});

// Auto resize textarea to fit words inside it without need to scroll -- Thanks to: https://stackoverflow.com/a/25621277
var input = document.getElementById("input");
var output = document.getElementById("output");
input.setAttribute("style", "height:" + output.scrollHeight + "px;overflow-y:scroll;");
output.setAttribute("style", "height:" + output.scrollHeight + "px;overflow-y:scroll;");
input.addEventListener("input", function (e) {
    this.style.height = 150 + "px";
    this.style.height = this.scrollHeight + "px";
});
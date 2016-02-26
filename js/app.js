const ReactDOM = require("react-dom");
const React = require("react");

const Page = require("./page.jsx");

window.onload = () => ReactDOM.render(
    React.createElement(Page, null), document.getElementById("pagecontainer"));

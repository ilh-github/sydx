(function () {
    'use strict';
    console.log("从github 注入脚本...");
    // 解除复制，粘贴，剪切功能。
    if (document.getElementById("app")) {
        document.getElementById("app").removeAttribute("onpaste")
        document.getElementById("app").removeAttribute("oncopy");
        document.getElementById("app").removeAttribute("oncut");

        // 解除文字选中
        const style = document.createElement("style");
        style.innerHTML = "body :not(textarea) {user-select: auto!important;}";
        document.head.appendChild(style);
    }

  })();

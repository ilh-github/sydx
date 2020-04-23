    (function () {
        'use strict';
        
        function log(msg) {
          console.log(msg, "background:#66a6ff;padding:3px 5px;border-radius:10%;");
        }
        
        log("$c从github 注入脚本...");
        console.log($("#app").attr("id"));

    })();

    (function () {
        'use strict';
        
        function log(msg) {
          console.log("%c"+msg, "background:#66a6ff;padding:3px 5px;border-radius:10%;");
        }
        
        
        if(!$){
            log("There is no jQuery, please try after refreshing");
            return;
        }
        
        log("来自github...");
        console.log($("#app").attr("id"));

    })();

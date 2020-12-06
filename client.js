


    // ==UserScript==
    // @name         石大客户端插件
    // @namespace    1978805993@qq.com
    // @version      1.0.0
    // @description	 //TODO
    // @author       1978805993
    // ==/UserScript==
    (function () {
      'use strict';

      /**
       * 脚本App
       */
      var App = function () {


        // 获取到的试题集合
        var questionList = [];


        // 要做的试题集合
        var doQuestionList = [];


        // 设置修改后，需要刷新或重新打开网课页面才会生效
        var setting = {
          // 5E3 == 5000，科学记数法，表示毫秒数
          time: 5E3 // 默认响应速度为5秒，不建议小于3秒   // 答题时间，和视频时间都依赖于此，建议请勿修改
          //, ip: "http://25by017051.wicp.vip"    // 如果使用本地不要忘记 http:// 的前缀 被坑过。
          , ip: "http://39.98.129.122:9999"    // 如果使用本地不要忘记 http:// 的前缀 被坑过。
          //, ip: "http://" + "127.0.0.1:9999"、
          , num: 0    // 题号，默认从零开始，可以在input框中指定位置
          , errors: []    // 累计出错的题号
          , autoScroll: true // 搜题面板是否自动触底
          , zoomFactor: 1
          , msg: "联系方式：QQ邮箱:1978805993@qq.com"
          , data_answer: localStorage.getItem("data_answer") ? JSON.parse(localStorage.getItem("data_answer")) : []
          , loop_time: 3 // 下一题的循环时间
        },
          url = location.pathname,	//	/learning//entity/function/homework/homeworkPaperList_showAnswer.action
          url_search = window.location.search,	//浏览器地址栏参数
          $ = window.jQuery,
          clog = window.Mylog; // 其实就是 console.log();

        /**
         * 日期格式化
         * 使用：var time1 = new Date().format("yyyy-MM-dd hh:mm:ss");
         */
        Date.prototype.format = function (fmt) {
          var o = {
            "M+": this.getMonth() + 1,                 //月份 
            "d+": this.getDate(),                    //日 
            "h+": this.getHours(),                   //小时 
            "m+": this.getMinutes(),                 //分 
            "s+": this.getSeconds(),                 //秒 
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
            "S": this.getMilliseconds()             //毫秒 
          };
          if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
          }
          for (var k in o) {
            if (new RegExp("(" + k + ")").test(fmt)) {
              fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            }
          }
          return fmt;
        }

        /**
         * 模拟用户输入
         */
        window.inputValue = function (dom, st) {
          var evt = new InputEvent('input', {
            inputType: 'insertText',
            data: st,
            dataTransfer: null,
            isComposing: false
          });
          dom.value = st;
          dom.dispatchEvent(evt);
        };


        /**
         * 初始化，主线程向渲染进程发送数组
         */
        var handlerInitIpcMain = function () {

          // 绑定渲染进程 nodeRequire
          const { ipcRenderer } = nodeRequire('electron');
          /**
           * 渲染进程绑定事件，等待主进程的调用。
           */
          ipcRenderer.on('save-file', (event, arg) => {
            // 程序启动
            handlerInitApp();
            handlerLayerMsg('执行成功！')
          })
        }


        if (!$) {
          log("There is no jQuery, please try after refreshing");
          alert("没有检测到 Jquery,可能造成脚本无法使用！ 请刷新后重试！");
          return;
        }



        /**
         * 使用Layui的Layer模块提示消息。
         * @param {消息} msg 
         */
        var handlerLayerMsg = function (msg) {
          handlerLayer(function () {
            layer.msg(msg);
            log(msg);
          });
        };

        /**
         * 使用Layui的Layer模块提示消息。
         * @param {回调函数} callback 
         */
        var handlerLayer = function (callback) {
          $.getScript('//cdn.jsdelivr.net/gh/sentsin/layer/dist/layer.js', callback);
        }




        /**
         * 警告打印
         * @param {消息} msg
         */
        var handlerWarn = function (msg) {
          clog("-------------警告---------------------");
          console.warn(msg);
          clog("-------------警告---------------------");
        }

        /**
         * 用promise对象封装   
         * 对ajax再次封装
         * @param {ajax参数} params 
         */
        var handlerJqPromiseAjax = params => {
          try {
            return new Promise((resolve, reject) => {
              $.ajax({
                ...params,
                dataType: 'json',
                success(res) {
                  resolve(res)
                },
                error(XMLHttpRequest) {
                  // 状态码
                  log(XMLHttpRequest.status);
                  // 状态
                  log(XMLHttpRequest.readyState);
                  var context = "";
                  if (XMLHttpRequest.status == 0) {
                    context = "服务器地址出错，如需要请联系管理员！" + setting.msg;
                  } else {
                    reject(XMLHttpRequest);
                    context = "其他错误信息，如需要请联系管理员！" + setting.msg;
                  }
                  if (context != "") {
                    alert(context);
                  }

                }
              })
            });
          } catch (error) {
            alert("Sorry！您的浏览器不支持Promise技术，推荐使用Chrome浏览器。");
          }
        };


        /**
         * 自定义系统日志
         */
        var handlerInitMyLog = function () {

          // 解除文字选中
          const style = document.createElement("style");
          style.innerHTML = " \
                 #sydx_content_div_parent ::-webkit-scrollbar { /*滚动条整体样式*/ \
                  width: 2px; /*宽分别对应竖滚动条的尺寸*/  \
                  height: 5px; /*高分别对应横滚动条的尺寸*/ \
                 } \
                 #sydx_content_div_parent ::-webkit-scrollbar-track { /*滚动条里面轨道*/ \
                  background-color: rgba(0, 0, 0, 0.5) \
                 } \
                 #sydx_content_div_parent ::-webkit-scrollbar-thumb { /*滚动条里面小方块transparent*/ \
                  background-color: white \
                 }";
          document.head.appendChild(style);

          setting.logDiv = $(
            '<div id="sydx_content_div_parent" style="font-size: 13px;border: 2px dashed rgb(0, 85, 68); width: 550px; position: fixed; bottom: 5px; left: 150px; z-index: 99999; background-color: rgba(0, 0, 0, 0.5); overflow: auto; color: white; padding: 15px; ">' +
            '<div id="sydx_content_div" style="max-height: 250px; overflow: auto;">' +
            '<ul style="font-size: 16px;">' +
            '<li style="display:none;" ></li>' +
            '</ul>' +
            '</div>' +
            '<button style="margin-right: 10px; ">增肥/瘦身[调试信息]</button>' +
            '<button style="margin-right: 10px; ">彻底关闭[调试信息]</button>' +
            '轮询<input  id="loop_time_input" type="text" style="width: 25px;" value="' + setting.loop_time + '" style="margin-right: 10px; "></input>秒' +
            '<button style="margin-right: 10px; ">开/关[自动点击下一题]</button>' +
            '<br/>' +
            '<button style="margin-right: 10px; ">下载答案</button>' +
            '<button style="margin-right: 10px; ">在练习页面获取正确答案</button>' +
            '<br/>' +
            '<button style="margin-right: 10px; ">2、上传答案</button>' +
            '<button style="margin-right: 10px; ">1、清空缓存答案[每一次打开一个新的考试时点击]</button>' +
            '<button style="margin-right: 10px; ">3、开始(绑定事件)</button>' +
            '</div>'
          ).appendTo('body')
            .on('change', '#loop_time_input', function () {  // 绑定 input
              const input = $(this);
              let maio = input.val();
              if (maio > 5) {
                maio = 5;
                input.val(maio);
              }
              if (maio <= 0) {
                maio = 2;
                input.val(maio);
              }
              setting.loop_time = maio;
              handlerLayerMsg("修改，轮询时间：" + setting.loop_time);

            })
            .on('click', 'button', function () {  // 绑定 button
              var len = $(this).prevAll('button').length;
              //nodeName标签名称
              if (len === 0) {
                setting.logDiv.find('ul').toggle('slow', function () {
                  // 滚动条触底
                  handlerMyLogScrollBootom();
                });
              }
              else if (len === 1) {
                setting.logDiv.detach();
                handlerLayerMsg("已关闭，如需打开请刷新页面！");
              }
              else if (len === 2) {
                if (setting.loop) {
                  handlerLayerMsg("已关闭自动下一题")
                  clearInterval(setting.loop);
                  delete setting.loop;
                } else {
                  handlerLayerMsg("已开启自动下一题")
                  setting.loop = setInterval(function () {

                    if (doQuestionList.length == 0) {
                      setting.logDiv.children('button:eq(' + len + ')').click();
                      return;
                    }
                    var href = $(".next a").attr("href");
                    if (href) {
                      href = href.substring(0, href.lastIndexOf("/") + 1) + (parseInt(href.substring(href.lastIndexOf("/") + 1)) + 1)
                      $(".next a").attr("href", href)[0].click()
                    } else {
                      setting.logDiv.children('button:eq(' + len + ')').click();
                    }
                  }, setting.loop_time * 1000)
                }
              }
              // 下载
              else if (len === 3) {
                handlerDownQuestionList();
              }
              // 获取答案
              else if (len === 4) {
                handlerFindExamQuestionList();
              }
              // 上传答案
              else if (len === 5) {
                handlerUploadQuestionList();
              }
              // 清空缓存
              else if (len === 6) {
                clearLocalCase();
                handlerLayerMsg("已清除本地缓存！");
              }
              // 开始
              else if (len === 7) {
                // 获取当前页面的题目集合
                handlerFindExamDoQuestionList();
              }

            }).hover(function () {
              setting.autoScroll = false;
            }, function () {
              setting.autoScroll = true;
            });


        };

        /**
         * 追加日志信息
         */
        var handlerAppendMyLog = function (msg) {
          //做出记录，去刷那些没有刷到的。
          var datetime = new Date().format("  hh:mm:ss.S ");
          //22:20:38.172 ›
          $(
            '<li style="margin: 4px 0px;" >' + '<span style="display: inline-block;width: 95px;" >' + datetime + '</span>' + '  >  ' + msg + '</li>'
          ).appendTo(setting.logDiv.find('ul'));
          // 当追加日志的时候判断是否需要滚动条触底
          if (setting.autoScroll) {
            handlerMyLogScrollBootom();
          }

        };

        /**
         * 自定义调试台滚动条触底
         */
        var handlerMyLogScrollBootom = function () {
          // 滚动条触底
          $("#sydx_content_div").scrollTop($("#sydx_content_div ul").height());
        }


        /**
         * 控制台输出
         * @param {信息} msg 
         */
        var log = function (msg) {
          msg = JSON.stringify(msg);
          clog("%c" + msg, "background:#66a6ff;color:#fff;padding:3px 5px;border-radius:10%;");
          handlerAppendMyLog(msg);
        }


        //////////////////////////////////



        /**
         * 初始化消息提示
         * @param {消息} msg
         */
        var handlerInitMsgDiv = function (msg) {
          //addMsgDiv(msg) {  // 消息提示
          // 防止重复追加
          if ($("#div_msg").length > 0) {
            return;
          }
          if (!msg) {
            msg = "加载中！";
          }
          /**
           * 创建消息提示框，并设置为可拖拽。
           */
          setting.div_msg = $(
            '<div id="div_msg" title="功能提示：上/下键可隐藏，按住：可移动" style="cursor: all-scroll; border: 2px dashed rgb(0, 85, 68);padding: 0.5px 3px; width: 330px; position: absolute; top: 15px; left: 15px; z-index: 8888; background-color: rgba(70, 196, 38, 0.6); overflow-x: auto;">' +
            '<span style="font-size: medium;color:red;">' + msg + '</span>' +
            '</div>'
          ).appendTo(setting.div).mousedown(function (ev) { // 按下拖拽功能
            var oThis = $(this).parent()[0];
            var ev = ev || window.event;
            var x = ev.clientX - oThis.offsetLeft;
            var y = ev.clientY - oThis.offsetTop;
            document.onmousemove = function (ev) {
              var ev = ev || window.event;
              var l = ev.clientX - x;
              var t = ev.clientY - y;
              if (l < 30) {
                l = 0;
              }
              if (l > document.documentElement.clientWidth - oThis.clientWidth - 30) {
                l = document.documentElement.clientWidth - oThis.clientWidth;
              }
              if (t < 30) {
                t = 0;
              }
              if (t > document.documentElement.clientHeight - oThis.clientHeight - 30) {
                t = document.documentElement.clientHeight - oThis.clientHeight;
              }
              oThis.style.left = l + 'px';
              oThis.style.top = t + 'px';
            }
            document.onmouseup = function () {
              document.onmousemove = null;
              document.onmouseup = null;
            }
            return false;
          });

        };

        /**
         * 向消息提示框里面添加内容
         * @param {消息} msg 
         */
        var handlerSetMsgDiv = function (msg) {
          try {

            setting.div_msg.find('span:eq(0)').html(msg)
          } catch (error) {
            console.error(error);
            alert("请刷新页面后重试！");
          }
        }


        /**
         * 初始化答案出现的内容框
         */
        var handlerInitAnswerDiv = function () {
          // 防止重复追加
          if ($("#div_parent").length > 0) {
            return;
          }
          setting.div = $(
            '<div id="div_parent" style="width: 350px;min-height: 100px; position: fixed;top: 0px;left: 0px;z-index: 99999;">' +
            '<div style="border: 2px dashed rgb(0, 85, 68); width: 330px; position: absolute;top: 65px;left: 15px;z-index: 8888;background-color: rgba(70, 196, 38, 0.6);overflow-x: auto;padding: 7px 10px;border-radius: 5%;color: #000;font-weight: bolder;">' +
            '<div id="content" style="font-size: medium;">已就绪！</div>' +
            '</div>' +
            '</div>'
          ).appendTo('body');

          // 控制答题面板的显示隐藏
          $(document).keydown(function (event) {
            if (event.keyCode == 38) {
              setting.div.detach();
              //detach() 方法移除被选元素，包括所有的文本和子节点。然后它会保留数据和事件。该方法会保留移除元素的副本，允许它们在以后被重新插入。
            } else if (event.keyCode == 40) {
              setting.div.appendTo('body');
            }
          });
        };

        /**
         * 设置答案内容框的内容
         * @param {答案内容} data
         */
        var handlerSetAnswerDiv = function (data) {
          //设置页面显示答案内容
          setting.div.find('#content').html(data)
        };

        /**
         * 设置等答案出现错误时，清空答案内容，设置错误信息。
         * @param {消息} msg 
         */
        var handlerSetErrorAnswerContent = function (msg) {
          handlerSetMsgDiv(msg);
          handlerSetAnswerDiv(null);
        };


        /**
         * 获取本地缓存中的密码，如果存在，将会实现自动填充。
         */
        var handlerGetHistoryPwd = function () {
          //直接修改value值是无法触发对应元素的事件的。通过发送输入框input事件了, 可以触发。 这里简单封装了一个方法.

          // 如果是登陆页面，判断用户是否有过登录记录，如果有，则帮助用户直接填写密码
          let user = JSON.parse(localStorage.getItem("user-for-reload"))
          // 判断是否存在用户对象
          if (user && typeof (user) != "undefined") {
            // 获取身份证
            let identityNumber = user.identityNumber;
            if (identityNumber.length > 0) {
              if ($("input[type='password']")[0]) {
                setTimeout(function () {
                  // 获取身份证后六位，一帮为默认密码
                  const pwd = identityNumber.substring(identityNumber.length - 6);
                  // 调用
                  window.inputValue($("input[type='password']")[0], pwd);
                  log("已帮您从历史记录中获取身份证后六位，作为密码快捷填写。");
                }, 2000)
              }
            }
          }


          // 监听账号，如果输入的是身份证，则获取后六位作为密码填写。
          $("input[type='text']")[0].onchange = function () {
            let oThis = $(this);
            log("清空密码");
            const val = oThis.val();
            if (val.length == 18) {
              const pwd = val.substring(val.length - 6);
              // 调用
              window.inputValue($("input[type='password']")[0], pwd);
              log("已重新帮您获取身份证后六位，作为密码快捷填写。");
            }
          }

        };


        /**
         * 初始化主进程的日志消息。
         */
        var handlerInitLocalStorageMyLog = function () {
          var logMsgData = JSON.parse(localStorage.getItem("logMsg"));
          if (!logMsgData || logMsgData == null) {
            logMsgData = [];
          }
          logMsgData.forEach((v) => {
            log(v);
          });
        }




        /**
         * 下载答案到本地
         */
        var handlerDownQuestionList = function () {

          // 1、拿到数据。
          if (questionList.length <= 0) {
            handlerLayerMsg("内存中没有答案，请先获取答案，再保存【切勿在正式考试点击该按钮】");
            return;
          }

          var fs = nodeRequire('fs');
          //写入json文件选项
          function writeJson(filePath, params) {
            var str = JSON.stringify(params);//因为nodejs的写入文件只认识字符串或者二进制数，所以把json对象转换成字符串重新写入json文件中
            fs.writeFile(filePath, str, function (err) {
              if (err) {
                console.error(err);
              }
              handlerLayerMsg("下载成功，请注意查收！");
              log('----------新增成功-------------');
            })
          }

          const { remote } = nodeRequire('electron');

          // 打开文件选择框
          async function openDialog() {
            const title = document.title;
            const fileName = title.substring(title.indexOf("：") + 1);
            const result = await remote.dialog.showSaveDialog({
              defaultPath: "../题库/" + fileName,
              filters: [
                { name: 'JSON', extensions: ['json'] }
              ]
            });
            const filePath = result.filePath;
            if (filePath != "") {
              writeJson(filePath, questionList)//执行一下;
            }

          }
          openDialog();






        };

        /**
         * 上传文件到缓存中
         */
        var handlerUploadQuestionList = function () {

          var fs = nodeRequire('fs');
          //通过传回来的页数，进行分页模拟
          function readFile(filePaths) {
            fs.readFile(filePaths, function (err, data) {
              if (err) {
                console.error(err);
              }
              questionList = JSON.parse(data.toString());
              localStorage.setItem("questionList", JSON.stringify(questionList));
              //把数据读出来
              handlerLayerMsg("上传成功！");
            })
          }

          const { remote } = nodeRequire('electron');

          // 打开文件选择框
          async function openDialog() {
            const result = await remote.dialog.showOpenDialog({
              properties: ['openFile'],
              defaultPath: "../题库/",
              filters: [
                { name: 'JSON', extensions: ['json'] }
              ]
            });
            const filePaths = result.filePaths;
            console.log(filePaths);
            // 读取文件 
            if (filePaths[0] && filePaths[0] != "") {
              readFile(filePaths[0])//执行一下;
            };
          };
          openDialog();

        };


        /**
         * 通过 questionId 获取试题和答案
         * @param {题号} questionId 
         */
        var handlerGetAnswerByQuestionId = async function (questionId, examRecordDataId) {
          // 获取答案
          // 准备请求参数
          // var params = {
          //   // https://cup.exam-cloud.cn/api/ecs_oe_student/examQuestion/getQuestionContent?questionId=5a03ec1157853f6b94c9c116&exam_record_id=4714291
          //   url: 'https://ecs.qmth.com.cn:8878/api/ecs_oe_student/examQuestion/getQuestionContent',
          //   type: "GET",
          //   async: false, // 搜索答题设置为同步，避免重复发送请求。
          //   data: {
          //     "questionId": questionId
          //   },
          //   dataType: "json",
          //   headers: {
          //     'token': sessionStorage.getItem("token"),
          //     'key': localStorage.getItem("key")
          //   }
          // }
          // // 得到请求结果
          // const respData = await handlerJqPromiseAjax(params).then(function (respData) { return respData });
          // var data = respData;

          var params = {
            // 
            url: 'https://cup.exam-cloud.cn/api/ecs_oe_student/examQuestion/getQuestionContent',
            type: "GET",
            async: false, // 搜索答题设置为同步，避免重复发送请求。
            data: {
              "questionId": questionId,
              "exam_record_id": examRecordDataId
            },
            dataType: "json",
            headers: {
              'token': sessionStorage.getItem("token"),
              'key': localStorage.getItem("key")
            }
          }
          // 得到请求结果
          const respData = await handlerJqPromiseAjax(params).then(function (respData) { return respData });
          var data = respData;

          if (data["questionUnitList"][0]["rightAnswer"]) {
            data["questionId"] = questionId;
            questionList.push(data);
            localStorage.setItem("questionList", JSON.stringify(questionList));
          }

        };


        /**
         * 获取当前试题页的所有试题(做题)
         * 目的：为了获取每一道题目的questionId
         * 题目的顺序是一样的。
         */
        var handlerFindExamDoQuestionList = async function () {

          if (questionList.length == 0) {
            handlerLayerMsg("请先上传答案！");
            return;
          }

          handlerAppendMyLog("获取要答题目中...");
          handlerLayer(function () {
            layer.closeAll();
            layer.msg('获取要答题目中...', {
              icon: 16
              , shade: 0.01
            });
          });

          // 测试，从缓存中取
          doQuestionList = localStorage.getItem("doQuestionList") ? JSON.parse(localStorage.getItem("doQuestionList")) : [];


          if (!doQuestionList || doQuestionList.length == 0) {
            doQuestionList = [];
            // 准备请求参数
            //      https://cup.exam-cloud.cn/api/ecs_oe_student/examQuestion/findExamQuestionList
            var params = {
              //url: 'https://ecs.qmth.com.cn:8878/api/ecs_oe_student/examQuestion/findExamQuestionList',
              url: 'https://cup.exam-cloud.cn/api/ecs_oe_student/examQuestion/findExamQuestionList',
              type: "GET",
              async: false, // 搜索答题设置为同步，避免重复发送请求。
              data: {},
              dataType: "json",
              headers: {
                'token': sessionStorage.getItem("token"),
                'key': localStorage.getItem("key")
              }
            }
            // 得到请求结果 获取到的试题集合
            const respData = await handlerJqPromiseAjax(params).then(function (respData) { return respData });

            for (var i = 0; i < respData.length; i++) {
              var Item = {
                "questionId": respData[i].questionId,
                "order": respData[i].order,
                "questionType": respData[i].questionType
              };
              doQuestionList.push(Item);

              localStorage.setItem("doQuestionList", JSON.stringify(doQuestionList));
            }
            log("===========重新获取答案===================");
          } else {
            log("=============缓存获取答案=================");
          }


          console.warn("doQuestionList", doQuestionList);
          //给右侧题目控制面板绑定监听事件
          handlerBindQuestionItem();
        }

        /**
         * 获取当前试题页的所有试题
         * 目的：为了获取每一道题目的questionId
         * 题目的顺序是一样的。
         */
        var handlerFindExamQuestionList = async function () {

          handlerAppendMyLog("获取答案中请稍后...");

          handlerLayer(function () {
            layer.closeAll();
            layer.msg('获取答案中请稍后...', {
              icon: 16
              , shade: 0.01
            });
          });

          // 测试，从缓存中取
          questionList = localStorage.getItem("questionList") ? JSON.parse(localStorage.getItem("questionList")) : [];

          if (questionList.length == 0) {
            // 准备请求参数
            var params = {
              //   更换新的接口
              //url: 'https://ecs.qmth.com.cn:8878/api/ecs_oe_student/examQuestion/findExamQuestionList',
              url: 'https://cup.exam-cloud.cn/api/ecs_oe_student/examQuestion/findExamQuestionList',
              type: "GET",
              async: false, // 搜索答题设置为同步，避免重复发送请求。
              data: {},
              dataType: "json",
              headers: {
                'token': sessionStorage.getItem("token"),
                'key': localStorage.getItem("key")
              }
            }
            // 得到请求结果 获取到的试题集合
            const respData = await handlerJqPromiseAjax(params).then(function (respData) { return respData });

            for (var i = 0; i < respData.length; i++) {
              handlerGetAnswerByQuestionId(respData[i].questionId, respData[i].examRecordDataId);
            }

            log("===========重新获取答案===================");
          } else {
            log("=============缓存获取答案=================");
          }


          handlerLayerMsg("已获取答案，可以保存");


        };

        /**
         * 点击从 questionList 获取答案
         * @param {order} order
         */
        var doAnswerByOrder = function (order) {
          setTimeout(async function () {
            // 获取要答题目的 Item
            var doQuestionItem = doQuestionList[order];

            // 得到 questionId
            var questionId = doQuestionItem.questionId;

            // 得到 题目文字描述
            var questionTitle = $(doQuestionItem.body).text();

            // 找到缓存中对应的答案。
            var questionItem = questionList.find((v) => {
              if (v.questionId == questionId) {
                return v;
              }
            });

            // 因为是下一道题的答案。所以需要等页面加载完毕之后再执行
            if (questionItem && typeof (questionItem) != "undefined") {

              handlerSetMsgDiv("正在执行...");

              var questionUnitList = questionItem.questionUnitList;

              // 一个题目一道题
              if (questionUnitList.length == 1) {
                var question = questionUnitList[0];
                // 题目类型
                var questionType = question.questionType;

                // 前提是存在答案才会执行
                if (question.rightAnswer) {

                  // 单选
                  if (questionType == "SINGLE_CHOICE") {
                    // 选项列表：
                    var questionOptionList = question.questionOptionList;
                    // 正确答案列表
                    var rightAnswerList = question.rightAnswer;

                    // 获取选项答案
                    var answer = questionOptionList[rightAnswerList[0]].body;

                    // 设置页面显示答案内容
                    handlerSetAnswerDiv(answer);

                    // 选中答案
                    var input = "input[type='radio'][value='" + rightAnswerList[0] + "']";
                    $(input).parent().click();
                    log("自动选中！");
                  }
                  // 多选
                  else if (questionType == "MULTIPLE_CHOICE") {
                    // 选项列表：
                    var questionOptionList = question.questionOptionList;
                    // 正确答案列表
                    var rightAnswerList = question.rightAnswer;

                    // 获取选项答案
                    var answer = "";
                    for (var i = 0; i < rightAnswerList.length; i++) {
                      answer += questionOptionList[rightAnswerList[i]].body;
                    }
                    // 设置页面显示答案内容
                    handlerSetAnswerDiv(answer);

                    // 选中答案
                    $("input[type='checkbox']").each(function (index, item) {
                      for (var j = 0; j < rightAnswerList.length; j++) {
                        var option = rightAnswerList[j];
                        if (option == index) {
                          if (!$(this).parent().hasClass("row-selected")) {
                            $(this).parent().click();
                          }
                        }
                      }
                    });

                    log("自动选中！");
                  }

                  // 判断题
                  else if (questionType == "TRUE_OR_FALSE") {
                    // 正确答案列表
                    var rightAnswerList = question.rightAnswer;

                    // 答案【true/false】
                    var answer = rightAnswerList[0];


                    // 设置页面显示答案内容
                    handlerSetAnswerDiv(answer);

                    // 选中答案
                    var input = "input[type='radio'][value='" + answer + "']";
                    $(input).parent().click();
                    log("自动选中！");
                  }

                  // 填空题型
                  else if (questionType == "FILL_UP") {
                    // 正确答案列表
                    var rightAnswerList = question.rightAnswer;

                    // 设置页面显示答案内容
                    handlerSetAnswerDiv(rightAnswerList[0].replace(/##/g, "<br/>"));

                    // 填空可能是多个选项框
                    var text = $(rightAnswerList[0]).text();
                    var answers = text.split("##");
                    $(".input-answer").each(function (index, item) {
                      window.inputValue($(this)[0], answers[index]);
                    });

                    log("自动填写！");
                  }

                  // 简答题  
                  else if (questionType == "ESSAY") {
                    // 正确答案列表
                    var rightAnswerList = question.rightAnswer;

                    // 答案【true/false】
                    var answer = rightAnswerList[0];

                    // 设置页面显示答案内容
                    handlerSetAnswerDiv(answer);

                    // 填写答案
                    $(".stu-answer")[0].focus();
                    $(".stu-answer").html(answer);
                    $(".stu-answer")[0].blur();

                    log("自动填写！");
                  }

                  // 还没有实验到的类型
                  else {
                    // 选项列表：
                    var questionOptionList = question.questionOptionList;
                    // 正确答案列表
                    var rightAnswerList = question.rightAnswer;
                    console.warn(rightAnswerList);
                    // 获取选项答案
                    handlerSetAnswerDiv(JSON.stringify(rightAnswerList));

                    log("请手动填写！");
                  }

                }

              }
              // 一个题目多道题：
              else {
                log("查询到" + questionId + "的集合长度不为 1" + questionUnitList.length);

                let content = "";
                for (let i = 0; i < questionUnitList.length; i++) {

                  var question = questionUnitList[i];
                  console.warn(question);
                  const body = question.body;
                  let rightAnswer_array = question.rightAnswer;
                  for (let k = 0; k < rightAnswer_array.length; k++) {
                    const item = rightAnswer_array[k];
                    item == 0 ? rightAnswer_array[k] = "A" :
                      item == 1 ? rightAnswer_array[k] = "B" :
                        item == 2 ? rightAnswer_array[k] = "C" :
                          item == 3 ? rightAnswer_array[k] = "D" :
                            item == 4 ? rightAnswer_array[k] = "E" :
                              item == 5 ? rightAnswer_array[k] = "F" :
                                item == 6 ? rightAnswer_array[k] = "G" :
                                  item == 7 ? rightAnswer_array[k] = "H" : rightAnswer_array[k];
                  }

                  content += "题目：" + body + "，答案：" + JSON.stringify(rightAnswer_array) + "<br/>";

                  // 题目类型
                  var questionType = question.questionType;
                  // 设置页面显示答案内容
                }

                handlerSetAnswerDiv(content);
                log("请手动填写！");

              }

            }

            // 没有获取到答案。尝试从学小易API接口获取答案。
            else {
              // 题目
              let title = questionTitle;
              // 获取答案
              // 准备请求参数
              var params = {
                url: 'https://app.51xuexiaoyi.com/api/v1/searchQuestion',
                type: "POST",
                //async: false, // 搜索答题设置为同步，避免重复发送请求。
                data: {
                  "keyword": title
                },
                dataType: "json",
                headers: {
                  "token": "wS8db9Ep6sGYDRhQyOMEk4uiyBklTYPAq4ehVeLwqFa1MpcpihLI34lhDTkg",  //认证token秘钥
                  "app-version": "1.0.6" // App版本号
                }
              }
              // 得到请求结果
              const respData = await handlerJqPromiseAjax(params).then(function (respData) { return respData });
              /*api接口示意图
      {
      "code": 200,
      "msg": "请求成功",
      "data": [
        {
            "q": "【这是简答题】哈哈哈哈哈哈",  //题目和选项
            "a": "不宝贝还",//答案
            "f": "eyJpdiI6Ijc5enpSMTd5TEFJc1VvY2NhS3M3blE9PSIsInZhbHVlIjoiYXV1MlNHZGtsU0UwTDVsaG1SeDQxSHQxQ3ExVkF2SFN2WmU2QTJTYmI1WXRkYURQNnVyZFhHdFZUQ1JIOElXXC9kU3Jkenl5bkd0aEpBald6Mis1dDhBeitBMUwwWlB3TkVUYXYzSVI1VFBkN0I0bnlEditieGcwcjhUWnQwUzRUN0lYUGREOUp4dkNVTXRSRElcLzVoZ2NWaDF2dlNNSjVyb3lBOG55a0hUeWxobExUOHdTOHk1dGMzWGNLS2E0M09KK0VseTJDTlR6NVdvbmJWV2Jzclg2VGNBR3pId0JIU3ZHdkgraFB2TDVsUFM1S1hOdW9HeUVRcXNid096c3FSOXc2bUlJSnBPbkJYQ2prcWtNT3c1V0Y0ZFlBVkhLWVhQYWo2cTNOUVNNU1d1d0praG9oeGpVQnFZMjZTcGdWR1p3NTQrWWVKU01cL25VdEFTTDFQcnJwMzdDbUlyRVlKejVvZ01QSGM0SGZBPSIsIm1hYyI6Ijg1MTUzZWJiODAwNGI1Mjc2ZDc0NDg3ODJjZTZlMGNjMzNlMTM5NWViYmM1ZmZlNjQxZTU0MTRlMjAxNjZhZTYifQ=="
        },
        {
            "q": "【这是简答题】哈哈哈哈哈哈",
            "a": "不宝贝还",
            "f": "eyJpdiI6IktwMnc0emg4NFwvVjRHM1NUb084SmxBPT0iLCJ2YWx1ZSI6IkM4cXJxRWlmUSt0RCsrVTVHQ3dOeHBwczZTNE1ydUFaYVFteXFablZlVE1oMmxxNjhOdyt5Wk5FRUc1SzN5MkF4R1lEMTBKVUtSTHFGVWNmVDFvY0hSQmpPc2VPRVNUWUlwMzM0SzhsYWhycnRUSFhIaUU5ZjJUWlIyMEhjYlloMXVHMG0wZllveEEyZW1jOHFiTE5YVVJNWUM2b2NwckV5K3RVa0JxWnN1Q29XSFZiWnZwQmxXd085YkR3YVZrMU96bkpwaEd4dHZXTHZjR0pHbnNMbEpBOXByZWl6QTdDendodFBhaVRFMHBSeVhRcm1kTHlCMUxuOGtnNlpkcE15eDR3bWREcktaWHgwT2pwVUNSOXp1NCtUM1I0RlVcLzd2anlPXC9oeTRVU0NvRlZsN1hGV3FERXpnTXdWQXR0WGVKeXlUNWQ0a3FLWlhBdjNHVW1wNE9HTklrNExcL0kzK25hbzhQQ25UMW55Zz0iLCJtYWMiOiJjZWUyMzBhODY3NmRlYTY4YWM1YjQ2MmU4NjEzNWRiYjgyMzAxODJhNTRlYzNlNzlmM2MzZmUzMmUxODU3OTE0In0="
        }
      ],
      "info": "",
      "ask": ""
      }*/
              var msg = "该道题没有找到，尝试在题库中手动搜索！";
              const code = respData.code;
              if (code == 200) {

                // 如果出现答案关闭自动下一题。
                if (setting.loop) {
                  setting.logDiv.children('button:eq(' + 2 + ')').click();
                }

                let dataList = respData.data;

                let strHtml = "";
                // 循环
                dataList.forEach((v) => {
                  let $oP = '<p>\
                    \<span>题目：' + v.q + '</span>\
                    \<br/>\
                    \<span>答案：' + v.a + '</span>\
                    \</p > ';
                  strHtml += $oP;
                });

                msg = respData.msg;

                // 设置提示消息
                handlerSetMsgDiv("从学小易获取：" + msg);

                // 设置答案到显示区域
                handlerSetAnswerDiv("从学小易获取：" + strHtml);
              } else {
                msg = "该道题没有找到，尝试在题库中手动搜索！";
                handlerSetErrorAnswerContent(msg);
              }
              log(msg);
            }

          }, 500)
        }

        /**
         * 给右侧题目控制面板绑定监听事件
         */
        var handlerBindQuestionItem = function () {

          // 右侧选项卡
          $(".item").click(function () {
            var oThis = $(this);
            var href = oThis.attr("href");
            // 序号按照顺序。
            var order = href.substring(href.lastIndexOf("/") + 1);
            //绑定单击事件
            order = order - 1;
            log(order);
            doAnswerByOrder(order);
          });

          // 上一题
          $(".prev").click(function () {
            var oA = $(this).find("a");
            if (oA.length == 1) {
              var href = oA.attr("href");
              // 序号按照顺序。
              var order = href.substring(href.lastIndexOf("/") + 1);
              //绑定单击事件
              log(order);
              doAnswerByOrder(order);
            }
          })
          // 下一题
          $(".next").click(function () {
            var oA = $(this).find("a");
            if (oA.length == 1) {
              var href = oA.attr("href");
              if (href && href.trim != "") {
                // 序号按照顺序。
                var order = href.substring(href.lastIndexOf("/") + 1);
                //绑定单击事件
                order = order - 2;
                log(order);
                doAnswerByOrder(order);
              }
            }
          })

          handlerLayerMsg("事件绑定完成，请使用！")

        }


        /**
         * App教程初始化
         */
        var handlerInitApp = function () {
          // 初始化（程序入口）
          url = location.pathname;
          log("当前位置：" + url);
          if (!$) {
            log("没有Jquery");
          }
          // 登录页面
          else if (url.match('/login')) {
            // 自动获取历史记录中的密码
            handlerGetHistoryPwd();
          }
          // 练习页面
          //https://ecs.qmth.com.cn:8878/oe/online-exam/exam/1618/examRecordData/300655/order/211
          else if (url.match('/online-exam/exam')) {


            let title = localStorage.getItem("documentTitle") ? localStorage.getItem("documentTitle") : "";
            if (title != "") {
              document.title = "当前位置：" + title;
            }

            // 设置信息
            handlerSetMsgDiv("程序启动.");

            log("获取试题列表");
            // setTimeout(function () {
            //   handlerFindExamQuestionList();
            // }, 5000);

            //handlerBindQuestionItem();

            // questionList.forEach((v) => {
            //   log(v.order);
            //   //getAnswerByQuestionId(v.questionId);
            // });


          }
          // 测试页面
          else if (url.match('/')) {

            log("脚本初始化已完成！");
            log("Have a good journey!");

          }


        }


        /**
         * 初始化绑定事件。
         */
        var handlerInitBindClick = function () {
          // 当点击开始考试后，让当前文档标题改变。
          if ($("#app > div > main > div.home > div > table > tbody tr td > div > button").length > 0) {

            $("#app > div > main > div.home > div > table > tbody tr td > div > button").one("click", function () {
              let title = $(this).parents("td").siblings("td").eq(0).text();
              console.log(title);
              if (title != "") {
                localStorage.setItem("documentTitle", title);
                document.title = "当前位置：" + title;
                // 清除缓存
                clearLocalCase();
              }
            });
          }

        };



        // 清除缓存
        function clearLocalCase() {
          questionList = [];
          doQuestionList = [];
          localStorage.removeItem("questionList");
          localStorage.removeItem("doQuestionList");
        }
        return {
          /**
            * App教程初始化
            */
          init() {


            // 初始化绑定事件。
            handlerInitBindClick();

            handlerLayerMsg('脚本加载完毕！');
            this.initMyLog();
            log("欢迎使用客户端脚本，很高兴为您服务：");
            log("插件提供方/文档介绍：https://github.com/ilh-github/sydx");

            log("本插件提供免费试用，如果您购买了，那说明您被骗了！");

            // 初始化，程序页面
            handlerInitApp();

            // 初始化，绑定主进程的脚本按钮
            handlerInitIpcMain();

            // 初始化，主线程的消息
            handlerInitLocalStorageMyLog();
            //测试滚动条自动触底。setInterval(function () { log("来自github..."); }, 2000)


            // 初始化答案框
            handlerInitAnswerDiv();
            // 消息提示框
            handlerInitMsgDiv();

            // 清除缓存
            clearLocalCase();
          },
          /**
           * 自定义系统日志
           */
          initMyLog() {
            handlerInitMyLog();
          },
          initBindClick() {
            handlerInitBindClick();
          }
        };



      }();

      App.init();

      var emote_list = document.getElementById('app');
      //DOMSubtreeModified
      emote_list.addEventListener('DOMNodeInserted', function () {
        // 初始化绑定事件。
        App.initBindClick();
      }, false);




    })();









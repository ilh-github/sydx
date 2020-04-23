// ==UserScript==
// @name         中国石油大学远程教育-插件合集-最终版
// @namespace    1978805993@qq.com
// @version      1.0.5
// @description	 快速答题、自动答题、视频截图、视频加速等诸多功能。如出现服务器错误等信息,请联系我。(联系方式：QQ:1978805993 QQ邮箱:1978805993@qq.com）

// @author       1978805993
// @match 	     http://www.cupde.cn/learning//entity/function/homework/*
// @match 	     http://www.cupde.cn/workspace/sso/center/ssoLoginByUserCenter_login.*
// @include      http://www.cupde.cn/learning//entity/first/peTchCoursewareItem_toMode.*
// @include      http://www.cupde.cn/learning/entity/first/peTchCoursewareItem_toMode.*
// @include      http://www.cupde.cn/learning/entity/function/homework/homeworkPaperList_toHomework.*
// @include      http://www.cupde.cn/learning//entity/function/homework/homeworkPaperList_showAnswer.*
// @connect      forestpolice.org
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @license      MIT
// @require 	https://code.jquery.com/jquery-3.4.1.min.js
// ==/UserScript==


(function () {
    'use strict';

    // 设置修改后，需要刷新或重新打开网课页面才会生效
    var setting = {
        // 5E3 == 5000，科学记数法，表示毫秒数
        time: 5E3 // 默认响应速度为5秒，不建议小于3秒   // 答题时间，和视频时间都依赖于此，建议请勿修改
        //, ip: "http://25by017051.wicp.vip"    // 如果使用本地不要忘记 http:// 的前缀 被坑过。
        , ip: "http://39.98.129.122:9999"    // 如果使用本地不要忘记 http:// 的前缀 被坑过。
        //, ip: "http://" + "127.0.0.1:9999"
        , token: '' // 捐助用户可以使用上传选项功能，更精准的匹配答案，此处填写捐助后获取的识别码
        , work: 0 // 自动答题功能,如果 work === 1 代表是要开启自动答题模式。默认关闭。
        , hide: 0 // 不加载答案搜索提示框，键盘↑和↓可以临时移除和加载，默认关闭
        , num: 0    // 题号，默认从零开始，可以在input框中指定位置
        , errors: []    // 累计出错的题号
        , abcdefg: true // 搜题面板是否自动触底
        , msg: "联系方式：QQ邮箱:1978805993@qq.com"

        // 视频加速使用 仅开启video时，修改此处才会生效
        , vol: '0' // 默认音量的百分数，设定范围：[0,100]，'0'为静音，默认'0'
        , rate: '1.0' // 默认播放速率，可选参数：['1.0', '1.25', '1.5']，默认'1.5'
        , count: [] //完成个数
        , incomplete_videos: [] //未处理的视频下标
        , error_num: 3 //允许重复的次数，如果重复本次视频高于设置次数则跳过该视频[建议不要小于三次，可能受网络影响]
        , error_videos: [] //	出错的视频下标
    },
        _self = unsafeWindow,
        url = location.pathname,	//	/learning//entity/function/homework/homeworkPaperList_showAnswer.action
        search_str = window.location.search,	//浏览器地址栏参数
        $ = _self.jQuery,
        // 视频加速使用 仅开启video时，修改此处才会生效
        url_pathname = window.location.pathname,  // url
        mySuccess = 0, 	// 执行成功的次数
        myError = 0, 	//	出错的次数
        error_size = 0;	// 同一个视频出现重复的次数



    // 警告打印
    function warn(msg) {
        console.error("-------------警告---------------------");
        console.log(msg);
        console.error("-------------警告---------------------");
    }
    // console.log() 简化
    function log(msg) {
        console.log(msg);
    }
    // 用promise对象封装   对ajax再次封装
    const jqPromiseAjax = params => {
        try {
            return new Promise((resolve, reject) => {
                $.ajax({
                    ...params,
                    type: 'POST',
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
                            sydxAnalysis.pingMsg(context);
                            alert(context);
                            return setting.div.children('div:eq(0)').data('html', context).siblings('button:eq(0)').click();
                        }

                    }
                })
            });
        } catch (error) {
            alert("Sorry！您的浏览器不支持Promise技术，推荐使用Chrome浏览器。");
        }


    }




    /* 石油大学解析 */
    var sydxAnalysis = {};

    // 消息提示
    sydxAnalysis.addMsgDiv = function (msg) {
        if (!msg) {
            msg = "加载中！";
        }
        setting.div_msg = $(
            '<div style="border: 2px dashed rgb(0, 85, 68); width: 330px; position: fixed; top: 15px; left: 15px; z-index: 99999; background-color: rgba(70, 196, 38, 0.6); overflow-x: auto;">' +
            '<span style="font-size: medium;color:red;">' + msg + '</span>' +
            '</div>'
        ).appendTo('body');
    }

    //页面显示信息
    sydxAnalysis.pingMsg = function (msg) {
        //正确
        setting.div_msg.find('span:eq(0)').html(function () {
            return msg;
        })
    };

    //获取地址栏参数
    sydxAnalysis.getParam = function (url, key) {
        url = url.substring(url.indexOf("?") + 1);
        var sp = url.split("&");
        var m = new Map();

        for (var i = 0; i < sp.length; i++) {
            var dd = sp[i].split("=");
            m.set(dd[0], dd[1]);
        }

        return m.get(key);
    }


    // 自动获取答案之后的自动答题
    sydxAnalysis.fillAnswer = function ($TiMu, obj) {
        var data = obj.data
        , n = 0;
        if (data == "正确") {
            data = 1;
        } else if (data == "错误") {
            data = 0;
        }
        $TiMu.find('input').each(function () {
            var $oThis = $(this),
                val = $oThis.val();
            //如果答案不唯一
            if (data.length > 1) {
                var daAns = data.split("");
                for (var i = 0; i < daAns.length; i++) {
                    if (val == daAns[i]) {
                        var oCc = $oThis.attr("checked");
                        if (oCc != "checked") {
                            $oThis.click();
                            n++;
                        }
                    }
                }
            } else {
                if (val == data) {
                    var oo = $oThis.attr("checked");
                    if (oo != "checked") {
                        $oThis.click();
                        n++;
                    }
                }
            }
        });
        return n == 0 ? false : true;
    }

    //从服务器查询答案
    sydxAnalysis.findAnswer = async function () {
        if (!$('.view').length) {
            return setting.div.children('div:eq(0)').data('html', '非自动答题页面').siblings('button:eq(0)').click();
        } else if (setting.max < 0 || setting.num < 0) {
            return setting.div.children('div:eq(0)').data('html', '范围参数应为 <font color="red">正整数</font>').siblings('button:eq(0)').click();
        } else if (($('.view').eq(setting.num).length == 0) || (setting.num >= ($('.view').length))) {
            sydxAnalysis.validation();
            return setting.div.children('div:eq(0)').data('html', '答题完毕！').siblings('button:eq(0)').click();
        } else if (setting.num > setting.max) {
            return setting.div.children('div:eq(0)').data('html', '区间答题完毕！').siblings('button:eq(0)').click();
        }
        var $TiMu = $('.view').eq(setting.num),
            text = $TiMu.find('h3').eq(0).text(),
            ti_hao = text.substring(0, text.indexOf("）") + 1).trim().split(".")[0],
            title = text.substring(text.indexOf("）") + 1).trim();

        // 防止题目过长导致结果所搜不到
        title = title.length > 50 ? title.substring(0, 51) : title;
        if (title.indexOf("'") != -1) {
            title = title.substring(title.indexOf("'") + 1)
        }
        if (title.indexOf("’") != -1) {
            title = title.substring(title.indexOf("’") + 1)
        }

        // 如果是图片的话获取src作为题目
        if ($TiMu.find('h3').eq(0) && $TiMu.find('h3').eq(0).html().match('<img')) {
            title = $TiMu.find('h3').eq(0).find("img").eq(0).attr("src");
        }

        var params = {
            url: setting.ip + '/onlineHomework/autoAnswerBytitle',
            async: false, // 搜索答题设置为同步，避免重复发送请求。
            data: {
                "token": (setting.token || 0),
                "title": encodeURIComponent(title.trim())
            }
        }
        await jqPromiseAjax(params).then(function (respData) {
            if (!setting.loop) {
            } else if (respData.code == 200) {
                var obj = respData;
                if (obj.code) {
                    setting.div.children('div:eq(0)').text('正在搜索答案...');
                    var data = obj.data.replace(/&/g, '&amp;').replace(/<([^i])/g, '&lt;$1');
                    data = data.substring(data.lastIndexOf(title[title.length - 1]) + 1)
                    var index = data.lastIndexOf("答案");
                    if (index == -1) {
                        $(
                            '<tr>' +
                            '<td style="text-align: center;">' + ti_hao.trim().replace('.', '') + '</td>' +
                            '<td title="点击可复制">' + title + '</td>' +
                            '<td title="点击可复制" style="color:red;">' + data + "【请手动查询，以题目前半段/后半段为条件】" + '</td>' +
                            '</tr>'
                        ).appendTo(setting.div.find('tbody'));
                        //添加到错误数组中
                        setting.errors.push(setting.num + 1);
                        //跳过
                        setting.num++;
                    } else {
                        $(
                            '<tr>' +
                            '<td style="text-align: center;">' + ti_hao.trim().replace('.', '') + '</td>' +
                            '<td title="点击可复制">' + title + '</td>' +
                            '<td title="点击可复制">' + data + '</td>' +
                            '</tr>'
                        ).appendTo(setting.div.find('tbody')).css('background-color', function () {
                            //答题
                            var da = data.substring(index + 3).trim().replace(/ /g, "").replace(/,/g, "");
                            obj.data = da;
                            if (sydxAnalysis.fillAnswer($TiMu, obj)) setting.num++;

                        });
                    }

                    if (setting.abcdefg) {
                        $("#sydx_content_div").scrollTop($("#sydx_content_div tbody").height());
                    }


                } else {
                    setting.div.children('div:eq(0)').html(obj.data || '服务器繁忙，正在重试...');
                }
                setting.div.children('span').html(obj.msg || '');
            }
        }).catch(function (XMLHttpRequest) {
            log(XMLHttpRequest);
            if (XMLHttpRequest.readyState && XMLHttpRequest.readyState.status == 403) {
                setting.div.children('div:eq(0)').data('html', '请求过于频繁，建议稍后再试').siblings('button:eq(0)').click();
            } else {
                setting.div.children('div:eq(0)').text('服务器异常，正在重试...');
            }
            var context = "";
            if (XMLHttpRequest.status == 0) {
                setting.loop && setting.div.children('div:eq(0)').text('服务器地址出错，如需要请联系管理员！...');
            } else {
                setting.loop && setting.div.children('div:eq(0)').text('服务器超时，正在重试...');
            }

        });

    }

    // 创建搜题模块
    sydxAnalysis.beforeAddHtml = function () {
        setting.div = $(
            '<div style="border: 2px dashed rgb(0, 85, 68); width: 330px; position: fixed; top: 65px; left: 15px; z-index: 99999; background-color: rgba(70, 196, 38, 0.6); overflow-x: auto;">' +
            '<span style="font-size: medium;"></span>' +
            '<div style="font-size: medium;">已就绪！</div>' +
            '<button style="margin-right: 10px;">开始答题</button>' +
            '<button style="margin-right: 10px;">重新查询</button>' +
            '<button style="margin-right: 10px;">折叠面板</button>' +
            '<form style="margin: 2px 0;">' +
            '<label style="font-weight: bold; color: red;">自定义答题范围：</label>' +
            '<input name="num" type="number" min="1" placeholder="开始" style="width: 60px;" >' +
            '<span> ~ </span>' +
            '<input name="max" type="number" min="1" placeholder="结束" style="width: 60px;" >' +
            '</form>' +
            '<div id="sydx_content_div"  style="max-height: 300px; overflow-y: auto;">' +
            '<table border="1" style="font-size: 12px;">' +
            '<thead>' +
            '<tr>' +
            '<th style="width: 30px; min-width: 30px; font-weight: bold; text-align: center;">题号</th>' +
            '<th style="width: 60%; min-width: 130px; font-weight: bold; text-align: center;">题目（点击可复制）</th>' +
            '<th style="min-width: 130px; font-weight: bold; text-align: center;">答案（点击可复制）</th>' +
            '</tr>' +
            '</thead>' +
            '<tfoot style="display: none;">' +
            '<tr>' +
            '<th colspan="3" style="font-weight: bold; text-align: center;">答案提示框 已折叠</th>' +
            '</tr>' +
            '</tfoot>' +
            '<tbody>' +
            '<tr>' +
            '<td colspan="3" style="display: none;"></td>' +
            '</tr>' +
            '</tbody>' +
            '</table>' +
            '</div>' +
            '</div>'
        ).appendTo('body').on('click', 'button, td', function () {
            var len = $(this).prevAll('button').length;
            //nodeName标签名称
            if (this.nodeName == 'TD') {//如果选中的是td，标签怎么做
                $(this).prev().length && GM_setClipboard($(this).text());
            } else if (len === 0) {
                if (setting.loop) {
                    clearInterval(setting.loop);
                    delete setting.loop;
                    len = [false, '已暂停搜索', '继续答题'];
                } else {
                    setting.loop = setInterval(sydxAnalysis.findAnswer, setting.time);
                    len = [true, '正在搜索答案...', '暂停答题'];
                }
                setting.div.find('input').attr('disabled', len[0]);
                setting.div.children('div:eq(0)').html(function () {
                    return $(this).data('html') || len[1];
                }).removeData('html');
                $(this).html(len[2]);
            } else if (len == 1) {
                location.reload();//重新查询
            } else if (len == 2) {
                //同时控制tbody，和tfoot两者的显示隐藏（完美利用错位）
                setting.div.find('tbody, tfoot').toggle();
            }
        }).on('change', 'input', function () {	//输入框改变
            setting[this.name] = this.value.match(/^\d+$/) ? parseInt(this.value) - 1 : -1;
            if (!this.value) setting[this.name] = this.name == 'num' ? 0 : undefined;
        }).hover(function () {
            setting.abcdefg = false;
        }, function () {
            setting.abcdefg = true;
        }).detach(setting.hide ? '*' : 'html');


        // 如果 setting.work === 1 代表是要开启自动答题模式
        if (setting.work === 1) {
            setting.loop = setInterval(sydxAnalysis.findAnswer, setting.time, true);
            setting.div.find('input').attr('disabled', true);
            setting.div.children('div:eq(0)').text('正在搜索答案...').siblings('button:eq(0)').text("暂停答题");
        }

        // 右侧搜索
        setting.search = $(
            '<div style="">' +
            '<div style="font-size: medium;position:fixed;width: 550px;top: 2px;right:0px;height: 30px;z-index: 99999">' +
            '<input placeholder="请输入题目【支持sql语句】" style="width: 366px;height: 30px;" maxlength="255" autocomplete="off" name="search" type="text" value="">' +
            '<button style="margin-right: 10px;">查询</button>' +
            '<button style="margin-right: 10px;">清空</button>' +
            '<button style="margin-right: 10px;">折叠面板</button>' +
            '</div>' +
            '<div id="msg" style="margin:0 auto;position:fixed; width: 550px;top:38px;right:0px; height: 390px; overflow-y: auto;  z-index: 99999;">' +
            '<iframe id="content" src=""  scrolling=yes target="middle" frameborder="0"  width="100%" height="100%" noResize></iframe>' +
            '</div>' +
            '</div>'
        ).appendTo('body').on('click', 'button', function () {
            var len = $(this).prevAll('button').length;
            if (len === 0) {
                var val = setting.search.find("input").val().trim();
                if (val == "") {
                    alert("请输入搜索内容！");
                    return;
                }
                var tt = encodeURIComponent(val);
                setting.search.find('#content').attr("src", "http://www.cupde.cn/learning/entity/function/lore/lore_store_question.jsp" + "?title=" + tt);
                if (setting.search.find('#msg').is(':hidden')) {
                    setting.search.find('#msg').show();
                }

            } else if (len == 1) {
                setting.search.find('input').val("");
            } else if (len == 2) {
                //同时控制tbody，和tfoot两者的显示隐藏（完美利用错位）
                setting.search.find('#msg').toggle();
            }
        });



        // 控制答题面板的显示隐藏
        $(document).keydown(function (event) {
            if (event.keyCode == 38) {
                setting.div.detach();
                setting.search.detach();
                //detach() 方法移除被选元素，包括所有的文本和子节点。然后它会保留数据和事件。该方法会保留移除元素的副本，允许它们在以后被重新插入。
            } else if (event.keyCode == 40) {
                setting.div.appendTo('body');
                setting.search.appendTo('body');
            }
        });



    }



    //单端，判断,多选。共用选中代码
    sydxAnalysis.pub = function (item, data_daan, index) {
        var daan = data_daan[index];
        var daAns = daan.split("");
        $("#" + item.getAttribute("id") + " li input").each(function (idex, items) {
            var val = $(this).val();
            //如果答案不唯一
            if (daAns.length > 1) {
                for (var i = 0; i < daAns.length; i++) {
                    if (val == daAns[i]) {
                        var oCc = items.getAttribute("checked");
                        if (oCc != "checked") {
                            $(this).click();
                        }
                    }
                }
            } else {
                if (val == daAns[0]) {
                    $(this).click();
                }
            }

        });
    };

    //自动选择答案（代替手选）
    sydxAnalysis.dati = function (data) {
        //（答题）。
        //声明单选，判断，多选答案容器。
        var tDANXUAN_data = data.danxuan.replace(/"/g, "").replace("[", "").replace("]", "").split(",");
        var tPANDUAN_data = data.pandaun.replace(/"/g, "").replace("[", "").replace("]", "").split(",");
        var tDUOXUAN_data = data.duoxuan.replace(/"/g, "").replace("[", "").replace("]", "").split(",");
        //----------------------------------------------
        //单选
        if (tDANXUAN_data.length > 0) {
            $("#tDANXUAN div ul").each(function (index, item) {
                sydxAnalysis.pub(item, tDANXUAN_data, index);
            });
        };
        //-------------------------------
        //判断：0|1   :1代表正确，0代表错误。
        if (tPANDUAN_data.length > 0) {
            $("#tPANDUAN div ul").each(function (index, item) {
                sydxAnalysis.pub(item, tPANDUAN_data, index);
            });
        };
        //------------------------------------------------------
        //复选：
        if (tDUOXUAN_data.length > 0) {
            $("#tDUOXUAN div ul").each(function (index, item) {
                sydxAnalysis.pub(item, tDUOXUAN_data, index);
            });
        };

        setTimeout(function(){
            //滚动条到底
            $(document).scrollTop($(document).height() - $(window).height());
        },500)

    }


    // 答题（从后台获取答案）
    sydxAnalysis.writeAnswer = async function () {
        //带着题号标识去找答案。
        var params = {
            url: setting.ip + "/onlineHomework/readAnswer",
            data: {
                "homework_info_id": sydxAnalysis.getParam(search_str, "homeworkInfo.id")
            }
        }
        await jqPromiseAjax(params).then(respDate => {
            log(respDate);
            if (respDate.code == -1) {
            } else if (respDate.code == 100) {//历史记录不存在，尝试从远程题库中获取
                sydxAnalysis.pingMsg(respDate.msg);
                sydxAnalysis.beforeAddHtml();
            } else if (respDate.code == 200) {
                var r = confirm("历史答案已存在，是否选择【急速答题】模式")
                if (r == true) {
                    sydxAnalysis.pingMsg(respDate.msg);
                    sydxAnalysis.dati(respDate.data);
                }
                else {
                    sydxAnalysis.pingMsg("已启用【搜题模式】！请点击开始答题按钮，继续答题！");
                    sydxAnalysis.beforeAddHtml();
                }
            }

        });

    }


    //从页面获取答案
    sydxAnalysis.getAnswer = function (arr1, obj) {
        var oId = obj.getAttribute("id");
        var name = "";
        //循环判断
        $("#" + oId + " li input").each(function (idex, items) {
            var oC = items.getAttribute("checked");
            if (oC == "checked") {
                name += items.value;
            }
        });
        return name.trim() == "" ? false : arr1.push(name.trim());
    }



    // 读取答案（并向后台添加答案）
    sydxAnalysis.readAnswer = async function () {
        //分别声明
        //声明单选，判断，多选答案容器。
        var tDANXUAN_data = [];
        var tPANDUAN_data = [];
        var tDUOXUAN_data = [];
        // 总分数
        var total_score = 0;

        // 获取总分，和题库里面的最高分作比较。如果比题库里面的分数高，则覆盖。否则题库不变保存相对最高分。
        $(".answer_score").each(function(){
            var txt = $(this).html();
            var num = txt.split("：")[1].split("分")[0];
            total_score+=parseFloat(num);
        });

        //单选
        $("#tDANXUAN div ul").each(function (index, item) {
            sydxAnalysis.getAnswer(tDANXUAN_data, item);
        });
        //-------------------------------
        //判断：0|1   :1代表正确，0代表错误。
        $("#tPANDUAN div ul").each(function (index, item) {
            sydxAnalysis.getAnswer(tPANDUAN_data, item);
        });
        //------------------------------------------------------
        //多选：
        $("#tDUOXUAN div ul").each(function (index, item) {
            sydxAnalysis.getAnswer(tDUOXUAN_data, item);
        });

        var params = {
            url: setting.ip + "/onlineHomework/addAnswer",
            data: {
                "name": decodeURI(sydxAnalysis.getParam(search_str, "homeworkInfo.title"))
                , "homework_info_id": sydxAnalysis.getParam(search_str, "homeworkInfo.id")
                , "danxuan": JSON.stringify(tDANXUAN_data)
                , "pandaun": JSON.stringify(tPANDUAN_data)
                , "duoxuan": JSON.stringify(tDUOXUAN_data)
                , "b1":total_score
            }
        }
        log(params.data);
        //请求后台添加答案
        await jqPromiseAjax(params).then(function (respDate) {
            log(respDate);
            sydxAnalysis.pingMsg(respDate.msg);
            if (respDate.code == -1) {
                return false;
            } else if (respDate.code == 200) {

            }
        });
    }

    // 效验是否答题完毕
    sydxAnalysis.validation = function () {
        if (setting.errors.length != 0) {
            warn("有未达题目：" + setting.errors.join(","));
            alert("有未达题目：" + setting.errors.join(","));
        } else {
            alert("答题完成！");
        }
    }


    //================================= 下面是视频加速代码 ============================================================

    /* 石油大学视频播放解析 */
    var sydxPalyer = {};

    // 创建插件模板
    sydxPalyer.beforeFind = function () {
        setting.div = $(
            '<div style="border: 2px dashed rgb(0, 85, 68); width: 330px; position: fixed; top: 20px; right: 20px; z-index: 99999; background-color: rgba(70, 196, 38, 0.6); overflow-x: auto;">' +
            '<span style="font-size: medium;color:red;"></span>' +
            '<div style="font-size: medium;">正在刷视频...(默认自动开启)</div>' +
            '<button style="margin-right: 10px;" id="btn_suspend">暂停</button>' +
            '<button style="margin-right: 10px;">折叠面板</button>' +
            '<button style="margin-right: 10px;">视频截图</button>' +
            '<button >上/下键显示隐藏</button>' +
            '<div style="max-height: 300px; overflow-y: auto;">' +
            '<table border="1" style="font-size: 12px;">' +
            '<thead>' +
            '<tr>' +
            '<th style="width: 30px; min-width: 30px; font-weight: bold; text-align: center;">题号</th>' +
            '<th style="width: 60%; min-width: 130px; font-weight: bold; text-align: center;">小节</th>' +
            '<th style="min-width: 130px; font-weight: bold; text-align: center;">状态</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody>' +
            '<tr>' +
            '<td colspan="3" style="display: none;"></td>' +
            '</tr>' +
            '</tbody>' +
            '</table>' +
            '</div>' +
            '<div id="countdown" style="position:absolute;z-index:999;top:2px;right:5px;font-size:25px;color:red;"></div>' +
            '</div>'
        ).appendTo('body').on('click', 'button, td', function () {
            var len = $(this).prevAll('button').length;//获取当前点击的前面的同胞。
            if (this.nodeName == 'TD') {

            } else if (len === 0) {
                //如果有定时器
                if (setting.loop) {
                    //关闭定时器，暂停
                    clearInterval(setting.loop);
                    delete setting.loop;
                    len = [false, '已暂停...' + "目前共帮助您完成：" + mySuccess + "个视频", 'play'];
                    sydxPalyer.myPlay_pause();
                } else {
                    //开启定时器
                    setting.loop = setInterval(sydxPalyer.myPlay, setting.time);
                    len = [true, '正在刷视频...', '暂停'];
                }
                //设置提示内容
                setting.div.children('div:eq(0)').html(function () {
                    return $(this).data('html') || len[1];
                }).removeData('html');

                $(this).html(len[2]);

            } else if (len == 1) {
                setting.div.find('tbody, tfoot').toggle();
            } else if (len == 2) {
                sydxPalyer.jietu();
            }
        });
        console.log("默认自动开启定时器");
        setting.loop = setInterval(sydxPalyer.myPlay, setting.time, true);


        // 控制答题面板的显示隐藏
        $(document).keydown(function (event) {
            if (event.keyCode == 38) {
                setting.div.detach();
                //detach() 方法移除被选元素，包括所有的文本和子节点。然后它会保留数据和事件。该方法会保留移除元素的副本，允许它们在以后被重新插入。
            } else if (event.keyCode == 40) {
                setting.div.appendTo('body');
            }
        });


    }


    //获取一共多少个视频。状态：COMPLETED：已完成，
    sydxPalyer.main = function () {

        sydxPalyer.beforeFind();

        $('.jqtree-folder-last ul li ul').each(function (index, item) {
            $(this).children("li").children("ul").each(function () {
                $(this).children("div").addClass("wsy_sub");
            });
        });

        //循环章节
        $('#tree .jqtree-folder-last:eq(1) ul:eq(0)>li').each(function (index, item) {
            $(this).find("ul").show();//展开小节
            //循环小节
            $(this).find("ul>li>div").each(function (index, item) {
                $(this).addClass("wsy_sub").click(function () {
                    var title = $(this).children("span[class='jqtree-title']").html();
                    for (var j = 0; j < setting.error_videos.length; j++) {
                        if (setting.error_videos[j] == title) {
                            return false;
                        }
                    }
                    if (!setting.loop) {
                        $("#btn_suspend").click();
                    }

                });
            });
        });

        //获取未刷视频。存入待完成数组 incomplete_videos=[];
        $("body>input[type=hidden][id$='status']").each(function (index, item) {
            if ($(this).val() == "COMPLETED") { //标识已完成，不需要再刷了

            } else {
                setting.incomplete_videos.push(index);
            }
        });

        // 加载代刷视频数据。循环td（内容）
        sydxPalyer.forTd();
    }

    // 加载代刷视频数据。循环td（内容）。生成右上角列表
    sydxPalyer.forTd = function () {
        //清空列表
        setting.div.find('tbody').empty();
        //循环没有完成的下标数组
        bbq:
        for (var i = 0; i < setting.incomplete_videos.length; i++) {
            var title = $(".wsy_sub:eq(" + setting.incomplete_videos[i] + ")").children("span[class='jqtree-title']").html();

            //title = "第一节 VPN与网络互联安全2";
            var tt = sydxPalyer.getTitle(title);
            ccc:
            for (var j = 0; j < setting.count.length; j++) {
                if (setting.count[j] == tt) {
                    continue bbq;
                }
            }
            //做出记录，去刷那些没有刷到的。
            $('<tr>' +
              '<td style="text-align: center;">' + (setting.incomplete_videos[i] + 1) + '</td>' +
              '<td title="点击切换至该视频" class="wsy_unBtn" >' + title + '</td>' +
              '<td title="点击">' + '未完成' + '</td>' +
              '</tr>'
             ).appendTo(setting.div.find('tbody')).css('background-color', function () {
                return 'rgba(0, 150, 136, 0.6)';
            }).on('click', '.wsy_unBtn', function () {
                //点击切换至该视频
                $(".wsy_sub:eq(" + ($(this).prev().html() - 1) + ")").click();

            });
        }
        setting.div.children('span:eq(0)').html(function () {
            return "本章节一共" + ($("body>input[type=hidden][id$='status']").length) + "个视频,已完成" + ($("body>input[type=hidden][id$='status']").length - setting.incomplete_videos.length) + "个";
        })

    }

    //截图
    sydxPalyer.jietu = function () {
        try {
            if (setting.incomplete_videos.length != 0) {
                if (confirm('视频尚未完成！确定要截图吗？')) {
                    console.log("哈哈");
                } else {
                    //终止
                    return false;
                }
            }
            //展开所有节点
            $(".jqtree-toggler").each(function () {
                $(this).parent("div").next("ul").show();
            });

            var name = $("#tree .jqtree-tree>.jqtree-folder-last>div>.jqtree-title").html();
            html2canvas($(".jqtree-tree")[0]).then(function (canvas) {
                var dataUrl = String(canvas.toDataURL());
                //下载图片
                sydxPalyer.downloadIamge(dataUrl, name);
            });
        } catch (error) {
            console.error(error);
            alert("请刷新页面后重试！");
        }
    }

    //下载图片
    sydxPalyer.downloadIamge = function (imgsrcData, name) {//下载图片地址和图片名
        var a = document.createElement("a"); // 生成一个a元素
        var event = new MouseEvent("click"); // 创建一个单击事件
        a.download = name || "photo"; // 设置图片名称
        a.href = imgsrcData; // 将生成的URL设置为a.href属性
        a.dispatchEvent(event); // 触发a的单击事件
    }

    /*
	 * 暂停。
	 */
    sydxPalyer.myPlay_pause = function () {
        var v = $("#scormContent").contents().find("video")[0];
        if (v) {
            //如果视频是暂停
            if (v.paused == false) {
                v.pause();
            }
            if (setting.loop) {
                clearInterval(setting.loop);
                //设置提示内容
                setting.div.children('div:eq(0)').html(function () {
                    return "请选择视频进行播放";
                });
            }
        }
    }


    // 快进播放。
    sydxPalyer.myPlay = function () {

        //如果已刷数量大于等于未完成数量。代表已经刷完！。
        if (setting.incomplete_videos.length == 0) {
            if (setting.loop) {
                $("#btn_suspend").click();
            }
            var cont = "视频已代刷完毕！<br/>本次共帮您完成：" + mySuccess + "个视频";
            setting.div.children('div:eq(0)').html(function () {
                return cont;
            });
            cont = "视频已代刷完毕\n本次共帮您完成：" + mySuccess + "个视频";

            if (setting.error_videos.length > 0) {
                cont += "\n未完成列表：【请手动完成】[" + setting.error_videos.join(",") + "]";
            }

            warn(cont);
            alert(cont);
            return;
        }
        var v = $("#scormContent").contents().find("video")[0];
        if (!v || v == "undefined") {//如果右边没有视频播放，直接return
            //如果已刷数量大于等于未完成数量。代表已经刷完！。
            if (!setting.loop) {
                $("#btn_suspend").click();
            }
            if (setting.incomplete_videos.length == 0) {
                cont = "视频已经全部刷完！";
                warn(cont);
                setting.div.children('div:eq(0)').html(function () {
                    return cont;
                });
            }
            console.log("不是视频页面");
            return;
        }

        var v_src = v.getAttribute("src");
        if ((typeof (v.getAttribute("src")) == "undefined") || (v_src == "")) {
            console.log(v);
            alert("出错，没有获取到视频");
            return;
        }

        if (!setting.loop) {
            sydxPalyer.myPlay_pause();
            return;
        }


        var title = sydxPalyer.getTitle($("#scormContent").contents().find("#courseTitle").html());
        var cc = sydxPalyer.getTitle(setting.div.find("tbody tr td:eq(1)").html());
        // 只要包含就行 (如果连包含都不包含，直接 skip )
        if (!title.match(cc)) {
            $(".wsy_unBtn:eq(0)").click();
        }

        //音量
        v.volume = setting.vol;
        //播放速度
        v.playbackRate = (!setting.rate || setting.rate == '') ? 1.5 : setting.rate;

        //如果视频是暂停
        if (v.paused && v.paused == true) {
            v.play();
        }

        //如果视频已经就绪
        if (v.readyState == 4) {
            //让视频从倒数第一秒开始播放
            if (v.duration > 0) {
                if (v.currentTime < (v.duration - 2)) {
                    v.currentTime = v.duration;
                }
            }
        } else {
            // 如果出现意外情况，强制视频快进！
            try {
                v.currentTime = v.duration;
            } catch (error) {

            }
        }

        error_size++;
        //如果出现重复次数大于三次则，则先跳过该视频
        // console.log("同一个视频重复的次数：" + error_size);
        if (error_size > setting.error_num) {
            sydxPalyer.myErrorFun();
        }


    }

    //	出错的回调
    sydxPalyer.myErrorFun = function () {
        //console.log(2);
        //判断是不是第一个未完成的。
        var cc = sydxPalyer.getTitle(setting.div.find("tbody tr td:eq(1)").html());
        //移除已完成的
        setting.count.push(cc);
        setting.incomplete_videos.shift();

        setting.error_videos.push(cc);
        myError++;
        console.log("第" + myError + "个错误，对应视频题号：" + cc);
        warn("解决方法：等其余视频刷完之后，点击出错的视频，不要使用视频加速[控制台的代码还在]，直接把视频拖至末尾等待视频自动跳转即可。")
        error_size = 0;
        sydxPalyer.forTd();
    }
    //	成功的回调
    sydxPalyer.mySuccessFun = function () {
        //console.log(2);
        //判断是不是第一个未完成的。
        var cc = sydxPalyer.getTitle(setting.div.find("tbody tr td:eq(1)").html());
        //移除已完成的
        setting.count.push(cc);
        setting.incomplete_videos.shift();
        //加加完成次数
        mySuccess++;
        error_size = 0;
        sydxPalyer.forTd();
    }

    // 获取课题名称
    sydxPalyer.getTitle = function (title) {
        if (!title || typeof (title) == undefined) {
            return "";
        }
        if (title.lastIndexOf(" ") != -1) {
            title = title.split(" ")[1];
        }
        return title;

    }

    // 补零函数
    function addZero(num, digit) {
        var min = Math.pow(10, digit ? (digit - 1) : 1); //满足该位数的最小数，如2位数为10
        if (num < min) { //如果小于最小数，则补零
            return '0' + num;
        }
        return num + '';
    }

    // 视频核心
    sydxPalyer.heXin = function () {

        //===========================覆盖代码===========================
        //修改原API的Finish方法来完成提交
        //当前节点学习结束时课件调用方法，计算学习时间并调用LMSCommit方法提交
        var myBool = false;	// 是否打印日志
        APIAdapter.isLMSInitialized = true;
        APIAdapter.LMSFinish = function (param) {
            if (this._Debug) {
                alert("In API::LMSFinish")
            }
            var result = this.cmiBooleanFalse;
            var tempParm = param.toString();
            if (tempParm == "null" || tempParm == "") {
                if (this.CheckInitialization() == true) {
                    var sessionTime = this.theSCOData.getValue("cmi.core.session_time");
                    if (myBool) {
                        console.log("sessionTime:" + sessionTime)
                    }
                    if (null != sessionTime) {
                        if (sessionTime.indexOf("NaN") != -1) {
                            sessionTime = "00:00:00.0"
                        }
                        var d = Math.random();
                        var url = this.servletURL + "?d=" + d + "&command=getTime";
                        saveData(url);
                        //////////////////*******************************
                        var vs = $("#scormContent").contents().find("video")[0];
                        if (vs == "undefined") {
                            alert("请播放视频");
                        }
                        var time = vs.duration;
                        var min = Math.floor(time % 3600);
                        var mytime = addZero(Math.floor(time / 3600)) + ":" + addZero(Math.floor(min / 60) + 5) + ":" + addZero(time % 60, 2);
                        sessionTime = mytime;
                        //重置学习时长
                        var total_time = this.theSCOData.addTimespan("00:00:00.0", sessionTime);
                        if (myBool) {
                            console.log("总学习时长：" + total_time)
                        }
                        // 设置学习时长（总共时长，设置为视频时长加上5分钟） ****
                        this.theSCOData.setValue("cmi.core.total_time", total_time)
                        //////////////////*******************************
                    }
                    var exit = this.theSCOData.getValue("cmi.core.exit");
                    if (exit == "") {
                        this.theSCOData.setValue("cmi.core.entry", "")
                    } else {
                        if (exit == "time-out") {
                            this.theSCOData.setValue("cmi.core.entry", "")
                        } else {
                            if (exit == "suspend") {
                                this.theSCOData.setValue("cmi.core.entry", "resume")
                            } else {
                                if (exit == "logout") {
                                    this.theSCOData.setValue("cmi.core.entry", "")
                                } else {
                                    this.theSCOData.setValue("cmi.core.entry", "")
                                }
                            }
                        }
                    }
                    //////////////////*******************************
                    if (myBool) {
                        console.log("当前节点修改之前的学习状态：" + this.theSCOData.getValue("cmi.core.lesson_status"))
                    }
                    // 强制设置学习状态为通过。
                    this.theSCOData.setValue("cmi.core.lesson_status", "completed");
                    if (myBool) {
                        console.log("当前节点修改之后节点的学习状态：" + this.theSCOData.getValue("cmi.core.lesson_status"))
                    }
                    // 为了方便程序计数。这里判断一下学习状态是否设置成功。
                    if (this.theSCOData.getValue("cmi.core.lesson_status") == "completed") {
                        // 如果成功继续执行
                        sydxPalyer.mySuccessFun();
                        console.log("本次共帮您完成：" + mySuccess)
                    } else {
                        // 如果失败先计数，再继续执行
                        sydxPalyer.myErrorFun();
                        console.log("出错!!!!!!!!!:" + myError)
                    }
                    if (this.theSCOData.getValue("cmi.core.lesson_status") == "not attempted") {
                        console.log("若该节点原先为未学习过的，将其状态设置为未完成");
                        this.theSCOData.setValue("cmi.core.lesson_status", "incomplete")
                    }
                    //////////////////*******************************
                    result = this.LMSCommit("");
                    if (result != this.cmiBooleanTrue) {
                        if (this._Debug) {
                            alert("LMSCommit failed causing LMSFinish to fail.")
                        }
                    } else {
                        this.isLMSInitialized = false;
                        try {
                            window.eval("changeSCOContent()")
                        } catch (e) { }
                        result = this.cmiBooleanTrue
                    }
                }
            } else {
                this.lmsErrorManager.setCurrentErrorCode("201")
            }
            if (this._Debug) {
                alert("Done Processing LMSFinish()")
            }
            return true
        };


    }

    // 程序初始化
    sydxPalyer.init = function () {
        //截图功能依赖的js
        if (!$) {
        } else if (url_pathname.match('/peTchCoursewareItem_toMode')) {	//视频页面
            // 导入截图js
            $('<script type="text/javascript" src="http://html2canvas.hertzen.com/dist/html2canvas.js"></script>').appendTo("body");
            // 程序启动
            sydxPalyer.main();
            sydxPalyer.heXin();
        }
    }

    // 首页截图。
    sydxAnalysis.uploadImg = function(){
        // 获取用户名称
        var name = $("#content_right .right_grxx .right_xinxi span").text();
        setting.uploadDiv = $(
            '<div style="font-size:16px;border: 2px dashed rgb(0, 85, 68); width: 330px; position: fixed; top: 15px; left: 15px; z-index: 99999; background-color: rgba(70, 196, 38, 0.6); overflow-x: auto;">' +
            '<span>如果需要下面的预览图效果，请先去视频页面下载图片，然后选择图片完成打包工作。</span>'+
            '<hr style="border:2px dashed  #000;"/>'+
            '<form id="fileUpForm"  method="post" action="'+setting.ip+'/fileUpload" enctype="multipart/form-data">'+
            '<input type="file" name="file"  multiple="multiple" accept="image/gif, image/png, image/jpg, image/jpeg"  >'+
            '<input type="text" name="username" value="'+name+'" placeholder="请输入您的名称">'+
            '<input type="button" id="btn"  value="上传/打包">'+
            '</form>'+
            '<input type="button" id="imgBtn"  value="显示/隐藏[demo]预览图">'+
            '<img src="'+setting.ip+'/static/img/demo.png" style="display:none" id="img" >'+
            '</div>').appendTo('body').on('click', '#btn', function () {
            var username = setting.uploadDiv.find('input[name="username"]').val();
            if(username == ""){
                alert("请输入用户名");
                return false;
            }
            var file  = setting.uploadDiv.find('input[name="file"]').val();
            if(file == ""){
                alert("请选择需要打包的图片");
                return false;
            }
            console.log(file);
            // 提交表单
            setting.uploadDiv.find("#fileUpForm").submit();
            // 清空图片
            setting.uploadDiv.find('input[name="file"]').val("");
        }).on('click', '#imgBtn', function () {
            setting.uploadDiv.find('#img').toggle();
        });

        // 面板的显示隐藏
        $(document).keydown(function (event) {
            if (event.keyCode == 38) {
                setting.uploadDiv.detach();
            } else if (event.keyCode == 40) {
                setting.uploadDiv.appendTo('body');
            }
        });

    }


    // 初始化（程序入口）
    sydxAnalysis.init = function () {
        if (!$) {
            sydxAnalysis.addMsgDiv("没有Jquery");
        } else if (url.match('/ssoLoginByUserCenter_login')) {	//登录成功之后的页面
            // 登录成功之后的页面。http://www.cupde.cn/workspace/sso/center/ssoLoginByUserCenter_login.action

            sydxAnalysis.uploadImg();

        } else if (url.match('/peTchCoursewareItem_toMode')) {	//视频页面

            // 视频程序启动
            sydxPalyer.init();
        } else if (url.match('/homeworkPaperList_toHomework')) {
            // 非主观题
            if(!$(".list_title_new").html().match("主观题")){
                sydxAnalysis.addMsgDiv();
                // 做题
                sydxAnalysis.writeAnswer();
            }
        } else if (url.match('/homeworkPaperList_showAnswer')) {

            // 非主观题
            if(!$(".list_title_new").html().match("主观题")){

                sydxAnalysis.addMsgDiv();
                // 读题
                sydxAnalysis.readAnswer();

                // 重置表单
                /*$("input").attr({
                    "checked": false,
                    "disabled": false
                });
                sydxAnalysis.writeAnswer();*/

            }
        }
    }


    // 程序启动
    sydxAnalysis.init();





})();

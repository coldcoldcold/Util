/**
 * @Description: 工具js，方便以后使用。
 * @Author:      WXP
 * @DateTime:    2015-10-21 14:01:02
 */
(function() {
    //使用严谨模式。
    "use strict";

    var root = this,
        __bat = root.bat;

    //bat 构造函数。
    var bat = function(context) {
        //扩展Date
        extend(Date.prototype, {
            //格式化日期
            format: function(format) {
                var o = {
                    "M+": this.getMonth() + 1, //month
                    "d+": this.getDate(), //day
                    "h+": this.getHours(), //hour
                    "m+": this.getMinutes(), //minute
                    "s+": this.getSeconds(), //second
                    "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
                    "S": this.getMilliseconds() //millisecond
                }
                if (/(y+)/.test(format)) format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
                for (var k in o)
                    if (new RegExp("(" + k + ")").test(format))
                        format = format.replace(RegExp.$1,
                            RegExp.$1.length == 1 ? o[k] :
                            ("00" + o[k]).substr(("" + o[k]).length));
                return format;
            }
        });
        //扩展String
        extend(String.prototype, {
            //计算字符串长度
            strLen: function() {
                var len = 0;
                for (var i = 0; i < this.length; i++) {
                    if (this.charCodeAt(i) > 255 || this.charCodeAt(i) < 0) len += 2;
                    else len++;
                }
                return len;
            },
            //将字符串拆成字符，并存到数组中
            strToChars: function() {
                var chars = new Array();
                for (var i = 0; i < this.length; i++) {
                    chars[i] = [this.substr(i, 1), this.isCHS(i)];
                }
                String.prototype.charsArray = chars;
                return chars;
            },
            //是否是汉字
            isCHS: function() {
                if (this.charCodeAt(i) > 255 || this.charCodeAt(i) < 0)
                    return true;
                else
                    return false;
            },
            //截取字符串（从start字节到end字节）
            subCHString: function(start, end) {
                var len = 0;
                var str = "";
                this.strToChars();
                for (var i = 0; i < this.length; i++) {
                    if (this.charsArray[i][1])
                        len += 2;
                    else
                        len++;
                    if (end < len)
                        return str;
                    else if (start < len)
                        str += this.charsArray[i][0];
                }
                return str;
            },
            //截取字符串（从start字节截取length个字节）
            subCHStr: function(start, length) {
                return this.subCHString(start, start + length);
            }
        });
        //扩展Number
        extend(Number.prototype, {
            //加
            add: function(arg) {
                var r1, r2, m;
                try {
                    r1 = this.toString().split(".")[1].length
                } catch (e) {
                    r1 = 0
                };
                try {
                    r2 = arg.toString().split(".")[1].length
                } catch (e) {
                    r2 = 0
                };
                m = Math.pow(10, Math.max(r1, r2));
                return (this * m + arg * m) / m;
            },
            //减
            sub: function(arg) {
                return this.add(-arg);
            },
            //乘
            mul: function(arg) {
                var m = 0,
                    s1 = this.toString(),
                    s2 = arg.toString();
                try {
                    m += s1.split(".")[1].length
                } catch (e) {};
                try {
                    m += s2.split(".")[1].length
                } catch (e) {};
                return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m);
            },
            //除
            div: function(arg) {
                var t1 = 0,
                    t2 = 0,
                    r1, r2;
                try {
                    t1 = this.toString().split(".")[1].length
                } catch (e) {};
                try {
                    t2 = arg.toString().split(".")[1].length
                } catch (e) {};
                r1 = Number(this.toString().replace(".", ""));
                r2 = Number(arg.toString().replace(".", ""));
                return (r1 / r2) * pow(10, t2 - t1);
            }
        });

        window.log = function(str) {
            if (window.console && typeof window.console.log === "function") {
                console.log(str);
            }
        }

        return this;
    }

    //default 放默认属性。用extend扩展。
    var symbol = bat.symbol = {
        'DCW' : document.body.clientWidth,//网页可见区域宽
        'DCH' : document.body.clientHeight,//网页可见区域高
        'DSW' : document.body.scrollWidth,//网页正文全文宽
        'DSH' : document.body.scrollHeight,//网页正文全文高
        'DST' : document.body.scrollTop,//网页滚动的高度
        'DSL' : document.body.scrollLeft,//网页滚动的宽度
    };
    //常用正则收录，特殊正则可使用extend扩展
    var regExp = bat.regExp = {
        'phone': /^([+]{0,1}\d{3,4}|\d{3,4}-)?\d{7,8}$/,
        'mobile': /^0{0,1}1[0-9]{10}$/,
        'QQ': /^[1-9][0-9]{4,}$/,
        'email': /^\w+([-+.]\w+)*@\w+([-.]\w+)*.\w+([-.]\w+)*$/,
        'IDCard': /(^\d{15}$)|(^\d{17}([0-9]|X)$)/
    };

    //bat工具类对象。 使用extend扩展。
    var tool = bat.tool = {};

    var amd = tool.amd = (typeof define === 'function' && define.amd),

        extend = tool.extend = function(base) {
            each(Array.prototype.slice.call(arguments, 1), function(extensionObject) {
                each(extensionObject, function(value, key) {
                    if (extensionObject.hasOwnProperty(key)) {
                        base[key] = value;
                    }
                });
            });
            return base;
        },

        _int = tool._int = function(str) {
            return parseInt(str,10);
        },

        _isNumber = tool._isNumber = function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        _isDefined = tool._isDefined = function(val) {
            return typeof val !== 'undefined';
        },

        _isUndefined = tool._isUndefined = function(val) {
            return typeof val === 'undefined';
        },

        _isObject = tool._isObject = function(val) {
            return val !== null && typeof val === 'object';
        },

        _isString = tool._isString = function(val) {
            return typeof val === 'string'
        },

        _isDate = tool._isDate = function(val) {
            return toString.call(val) === '[object Date]';
        },

        _isFunction = tool._isFunction = function(val) {
            return typeof val === 'function';
        },

        _isArray = tool._isArray = (function() {
            if (!_isFunction(Array.isArray)) {
                return function(val) {
                    return toString.call(val) === '[object Array]'
                };
            };
            return Array.isArray;
        })(),

        _isRegexp = tool._isRegexp = function(val) {
            return toString.call(val) === '[object Regexp]';
        },

        _isEmpty = tool._isEmpty = function(str) {
            var bool;
            str === null || typeof str ==='undefined' || str.trim() === '' ? bool = true : bool = false;
            return bool;
        },

        trim = tool.trim = (function() {
            if (!String.prototype.trim) {
                return function(value) {
                  return isString(value) ? value.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : value;
                };
            }
            return function(value) {
                return _isString(value) ? value.trim() : value;
            };
        })(),
        /**
         * @Description: desc  
         * @param:       'str1,str2,....' 
         * @return:      {key1:value1,key2:value2,....}
         */
        makeMap = tool.makeMap = function(str) {
            var obj = {}, items = str.split(","), i;
            for ( i = 0; i < items.length; i++ )
                obj[ items[i] ] = true;
            return obj;
        },

        include = tool.include = function(param) {
            var array = param.array,
                obj = param.obj;
            return indexOf(array, obj) != -1;
        },

        requestAnimFrame = tool.requestAnimFrame = (function() {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback) {
                    return window.setTimeout(callback, 1000 / 60);
                };
        })(),

        cancelAnimFrame = tool.cancelAnimFrame = (function() {
            return window.cancelAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                window.mozCancelAnimationFrame ||
                window.oCancelAnimationFrame ||
                window.msCancelAnimationFrame ||
                function(callback) {
                    return window.clearTimeout(callback, 1000 / 60);
                };
        })(),

        animationLoop = tool.animationLoop = function(callback, totalSteps, easingString, onProgress, onComplete, chartInstance) {
            var currentStep = 0,
                easingFunction = easingEffects[easingString] || easingEffects.linear;
            var animationFrame = function() {
                currentStep++;
                var stepDecimal = currentStep / totalSteps;
                var easeDecimal = easingFunction(stepDecimal);
                callback.call(chartInstance, easeDecimal, stepDecimal, currentStep);
                onProgress.call(chartInstance, easeDecimal, stepDecimal);
                if (currentStep < totalSteps) {
                    chartInstance.animationFrame = requestAnimFrame(animationFrame);
                } else {
                    onComplete.apply(chartInstance);
                }
            };
            requestAnimFrame(animationFrame);
        },

        clone = tool.clone = function(obj) {
            var objClone = {};
            each(obj, function(value, key) {
                if (obj.hasOwnProperty(key)) {
                    objClone[key] = value;
                }
            });
            return objClone;
        },

        each = tool.each = function(loopable, callback, self) {
            var additionalArgs = Array.prototype.slice.call(arguments, 3);
            // Check to see if null or undefined firstly.
            if (loopable) {
                if (loopable.length === +loopable.length) {
                    var i;
                    for (i = 0; i < loopable.length; i++) {
                        callback.apply(self, [loopable[i], i].concat(additionalArgs));
                    }
                } else {
                    for (var item in loopable) {
                        callback.apply(self, [loopable[item], item].concat(additionalArgs));
                    }
                }
            }
        },

        //多元素各绑定不同事件
        bind_diffevent = tool.bind_diffevent = function(param) {
            var dom_list = param.dom_list,
                handle_list = param.handle_list
            each(dom_list,function(dom,index){
                (function(i){
                    dom.addEventListener('click',handle_list[i],false);
                })(index)
            });
        },

        //自定义事件监听机制
        _event = tool._event = function() {
            var listen, log, obj, one, remove, trigger, __this;
            obj = {};
            __this = this;
            listen = function(key, eventfn) {
                var stack, _ref;
                stack = (_ref = obj[key]) != null ? _ref : obj[key] = [];
                return stack.push(eventfn);
            };
            one = function(key, eventfn) {
                remove(key);
                return listen(key, eventfn);
            };
            remove = function(key) {
                var _ref;
                return (_ref = obj[key]) != null ? _ref.length = 0 : void 0;
            };
            trigger = function() {
                var fn, stack, _i, _len, _ref, key;
                key = Array.prototype.shift.call(arguments);
                stack = (_ref = obj[key]) != null ? _ref : obj[key] = [];
                for (_i = 0, _len = stack.length; _i < _len; _i++) {
                    fn = stack[_i];
                    if (fn.apply(__this, arguments) === false) {
                        return false;
                    }
                }
            };
            return {
                listen: listen,
                one: one,
                remove: remove,
                trigger: trigger
            }
        },

        /**
         * @Description: bind event  
         * @param:       dom: bind element 
         *               _init: init function
         *               _start: start event handle function
         *               _move: move event handle function
         *               _end: end event handle function
         * @return:      null
         */
        bind_event = tool.bind_event = function(param) {
            var binder = {
                touch: ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch,
                obj: param.dom,
                events: {
                    obj : this.obj,
                    handleEvent : function(event) {
                        var self = this;
                        if (event.type === 'touchstart') {
                            self.start(event);
                        }else if (event.type === 'touchmove') {
                            self.move(event);
                        }else if (event.type === 'touchend') {
                            self.end(event);
                        };
                    },
                    start : function(event) {
                        var self = this;
                        _isDefined(param._start) && _isFunction(param._start) ? (param._start)(event,this) : function(){};
                        self.obj.addEventListener('touchmove',self.events,false);
                        self.obj.addEventListener('touchend',self.events,false);
                    },
                    move : function(event) {
                        var self = this;
                        _isDefined(param._move) && _isFunction(param._move) ? (param._move)(event,this) : function(){};
                    },
                    end : function(event) {
                        var self = this;
                        _isDefined(param._move) && _isFunction(param._move) ? (param._move)(event,this) : function(){};
                        self.obj.removeEventListener('touchmove',self,false);
                        self.obj.removeEventListener('touchend',self,false);
                    },
                    init : function(event) {
                        var self = this;
                        _isDefined(param._init) && _isFunction(param._init) ? (param._init)(event,this) : function(){};
                        self.obj.addEventListener('touchstart',self.events,false);
                    }
                }
            }
            binder.init();
        },

        //动态创建样式
        create_css = tool.create_css = function(param) {
            var styles = param,
                css = document.createElement('style');
            css.type = 'text/css';
            each(styles, function(style) {
                var rules = document.createTextNode(style);
                css.appendChild(rules);
            });
            document.getElementsByTagName("head")[0].appendChild(css);
        },
        //快速排序
        quick_sort = tool.quick_sort = function(array) {
            if (array.length <= 1) {
                return array;
            }　　
            var pivotIndex = Math.floor(array.length / 2);　　
            var pivot = array.splice(pivotIndex, 1)[0];　　
            var left = [];　　
            var right = [];　　
            for (var i = 0; i < array.length; i++) {　　　　
                if (array[i] < pivot) {　　　　　　
                    left.push(array[i]);　　　　
                } else {　　　　　　
                    right.push(array[i]);　　　　
                }　　
            }
            return quick_sort(left).concat([pivot], quick_sort(right));
        },
        //canvas在dom中的坐标转换成在canvas中的坐标
        window_to_canvas = tool.window_to_canvas = function(canvas, x, y) {
            var __box = canvas.getBoundingClientRect();

            return {
                x: x - __box.left * (canvas.width / __box.width),
                y: y - __box.top * (canvas.height / __box.height)
            }
        },
        max = tool.max = function(array) {
            return Math.max.apply(Math, array);
        },
        min = tool.min = function(array) {
            return Math.min.apply(Math, array);
        },
        toRadians = tool.radians = function(degrees) {
            return degrees * (Math.PI / 180);
        },
        arr_push = tool.arr_push = function(arr1, arr2) {
            return Array.prototype.push.apply(arr1, arr2);
        },
        is_fit = tool.is_fit = function(param) {
            var type = param.type,
                str = param.str,
                is_not;
            each(regExp, function(value, key) {
                if (type === key) {
                    is_not = value.test(str) ? true : false;
                };
            });
            return is_not;
        },
        getUrlParameter = tool.getUrlParameter = function(paramName) {
            var reg = new RegExp("(^|&)" + paramName + "=([^&]*)(&|$)", "i"),
                arr = window.location.search.substr(1).match(reg);
            if (arr) {
                return arr[2];
            }
            return null;
        },
        href = tool.href = function(url) {
            var appVersion = navigator.appVersion.toLocaleLowerCase();
            if (appVersion.indexOf("windows phone") > 0) {
                window.external.notify(url);
            } else if (appVersion.indexOf("android") > 0) {
                window.MyWebView.onJsOverrideUrlLoading(url);
            } else {
                // use the default href for iphone, PC and others.
                window.location.href = url;
            }
        },
        has_property = tool.has_property = function(param) {
            var obj = param.obj,
                prop = param.prop,
                origin = param.origin,
                has_or_not;
            origin ? (function(){
                has_or_not = prop in obj;
            })() : (function(){
                has_or_not = obj.hasOwnProperty(prop);
            })()
            return has_or_not;
        }

    //外部引用统一处理
    if (amd) {
        define(function() {
            return bat;
        });
    } else if (typeof module === 'object' && module.exports) {
        module.exports = bat;
    }
    root.bat = bat;
    bat.noConflict = function() {
        root.bat = __bat;
        return bat;
    };

}).call(this);

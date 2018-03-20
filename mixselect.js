//说明：本控件，由于项目需求（iscroll表现不好），根据ali的demo改编，核心方法_gt，主要获取当前dom，当前的translate值，然后设置transform（用translate3D开启加速）
//根据具体项目需求，和ali swaper的核心方法_gt，进行具体改编。
//_gt中核心方法，window.getComputedStyle获取实际样式值是核心。
/**
 * 调用示例：
 * eg:
 * new s({
        value: v,
        dom: '.content',
        type: 'diy',
        selectId: ['28','2814','281402'],
        depth: 3,
        title: '请选择地区',
        success: function(obj){
            console.log(obj);
        },
        fail: function(err){
            console.log(err);
        }
    });
    new s({
        title: '选择结束时间',
        dom: '.content',
        type: 'datepicker',
        enddate: '1',
        success: function(obj){
            console.log(obj);
        },
        fail: function(err){
            console.log(err);
        }
    })
    返回值说明：
    正常情况返回：obj
    {
        level1:{
            返回值根据给的值定，但必有一个键值对为 value: xxxx
        },
        level2:层级根据给定的 depth定
    }
    eg: depth=3,value为下面type=diy的示例参数，返回的一种可能为：
        {
            level1: {
                txt: '北京',
                id: '01',
                value: '北京'，
                index: '27'
            },
            level2: {
                txt: '东城区’,
                id: '0102',
                value: '东城区',
                index: '50'
            },
            level3: {
                txt: 'test',
                id: '01010',
                value: 'test',
                index: '28'
            }
        }
    截止日期控件，并选择截止日期为长期，返回string '长期'；
    其余情况日期控件的返回，level1.value 为年份level2.value 为月 level3.value 为日

 * 任意类型控件必填参数：
 * type: diy|datepicker 
 * dom: 控件挂载的父节点
 * success: 成功回调，返回用户选择
 * fail: 失败回调，返回空
 * 整体控件根据type分为两种
 * 1.type=diy
 * 有效的参数：
 *  value： 必传，具体数据
 *  value eg: 
 * [{
    "txt": "北京",
    "id": "01",
    "sub": [{
        "txt": "东城区",
        "id": "0102",
        "sub": [{
            "txt": "test",
            "id": "010101",
            "sub": []
        }]
    }, {
        "txt": "西城区",
        "id": "0103",
        "sub": []
    }, {
        "txt": "崇文区",
        "id": "0104",
        "sub": []
    }]
}]
 *  selectId： 目前选择的id，选填，具体id根据value来,eg: ['01','0102','010101']
 *  depth: 深度，选填 建议不要大于3；不填默认为3；
 *  title: 控件标题，diy时建议必填，否则默认标题 选择开始时间，肯定不是想见到的。
 *  2.type=datepicker 
 *  有效参数：
 *  title: 控件标题，不填默认选择开始时间
 *  nowdate: 默认展示日期，不填默认当天 支持yyyy-mm--dd,yyyy.mm.dd,yyyy/mm/dd
 *  enddate: 选择结束日期 1是，选填，不传默认开始日期
 *  longcheck: 是否长期 1 长期
 */
require.config({
    baseUrl: "/common/vendor",
    paths: {
        "jquery": "/common/vendor/jquery-2.1.4/jquery-2.1.4.min"
    },
    charset: "utf-8"
});
define([
    'jquery'
], function($) {
    var _DEBUG_SWITCH = false;
    /**
     * 普通参数
     */
    var _scn = 'mixselectSwiperItemSelected';
    var _sc = '.mixselectContent';
    var _rcv = {}; //重新构建的数据
    var _dva = {
        year: [],
        month: [],
        day: []
    }; //默认日期数据
    var _dyfu = 50; // 年上阀值 这里就是上下50年
    var _dyfl = 50; // 年下阀值
    var _dyvm = '2018-01-01'; //考虑到本地日期篡改问题，新增中间日期量，以中间日期稳准，按上下阀值取年份数组；
    //应需求  新增日历控件起止日期参数 这里设置默认参数
    var _stday = '1900';
    var _eday = '2049';
    var _localType = '';//存储类型变量
    var _usercefunc = null;//存放失败回调
    var _usersefunc = null;//存放成功回调
    var _isenddate = '0';//是否结束日期选择框，1是，默认0
    var _lbtntxt = '取消';//左按钮文字
    var _rbtntxt = '确定';//右按钮文字
    var _edtiptxt = '身份证有效期为长期有效';//结束日期tip文字
    var _ldtxt = '长期';//长期时返回值
    /**
     * 滚动控制参数
     */
    var isTouched,
        isMoved,
        touchStartY,
        touchCurrentY,
        touchStartTime,
        touchEndTime,
        startTranslate,
        returnTo,
        currentTranslate,
        prevTranslate,
        velocityTranslate,
        velocityTime,
        clientHeight,
        itemHeight,
        itemsHeight,
        wrapperHeight,
        minTranslate,
        maxTranslate,
        animationFrameId,
        momentumRatio = 7,
        callbackDepth = 0,
        _dftrmeter = 90; //momentumRatio = 默认速率

    function preventDefault(e){
        e.preventDefault();
        e.stopPropagation();
    }

    //占位符格式化方法
    String.prototype._f = function(_s) {
        if (arguments.length === 0)
            return this;
        for (var s = this, i = 0; i < arguments.length; i++) {
            s = s.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
        }
        return s;
    };

    /**
     * select 构造函数(整体默认date控件)
     * value:必传
     * domstr:必传
     */

    var s = function(_p) {
        //数据
        var v = _p.value ? _p.value : {};
        //已选择id array[第一级id,第二级id,第三级id];
        var s = _p.selectId ? _p.selectId : [];
        //需要默认展示的date 只有在type=datepicker的时候有用。
        var nd = _p.nowdate;
        //数据深度
        var depth = _p.depth && _p.depth !== '' ? _p.depth : 3; //默认深度为3
        //为日历，新增起止日期参数
        if(_p.startDay && _p.startDay !== '')
            _stday = _p.startDay;
        if(_p.endDay && _p.endDay !== '')
            _eday = _p.endDay;
        //父节点
        var d = _p.dom;
        //标题
        var t = _p.title && _p.title !== '' ? _p.title : '选择开始时间';
        //成功回调
        _usersefunc = _p.success;
        //失败回调
        _usercefunc = _p.fail;
        //类型
        var tp = _localType = _p.type;
        //是否长期
        var _ilc = _p.longcheck && _p.longcheck !== '' ? _p.longcheck : '0';
        //是否结束日期选择框
        if(_p.enddate && _p.enddate === '1')
            _isenddate = _p.enddate;
        var r = this;
        var _nobj = {};
        if (tp === 'diy') _rcvf(v);
        else if (tp === 'datepicker') _nobj = _cdv(nd);
        if (!s || s.length === 0) { //没有提供selectId的情况下，获取默认第一层id
            try {//try catch 处理selectId未传情况，创建默认selectId,深度最大三层
                s[0] = v[0].id;
            } catch (error) {
                if(_DEBUG_SWITCH) throw new Error('empty value level 1');
            }
            try {
                s[1] = v[0].sub[0].id;
            } catch (error) {
                if(_DEBUG_SWITCH) throw new Error('empty value level 2');
            }
            try {
                s[2] = v[0].sub[0].sub[0].id;
            } catch (error) {
                if(_DEBUG_SWITCH) throw new Error('empty value level 3');
            }
        }
        r._i(v, s, d, depth,t,tp,_nobj,_ilc);
    };

    var _iparam = function(){//初始化参数
        callbackDepth = 0;
        _rcv = {}; //重新构建的数据
        _dva = {
            year: [],
            month: [],
            day: []
        };
        _isenddate = '0';
        _localType = '';
    };

    var _cefunc = function(e){//失败回调
        $('.mixselectMask').remove();
        _iparam();
        $('.mixselectMask').unbind('touchmove',preventDefault);
        _usercefunc('');
    };

    var _sefunc = function(e){//成功回调
        if(_localType === 'datepicker' && _isenddate === '1' && $('.mixselectEndDateCheckBox').length > 0 && $('.mixselectEndDateCheckBox').hasClass('endDateChecked')){
            $('.mixselectMask').remove();
            _iparam();
            $('.mixselectMask').unbind('touchmove',preventDefault);
            _usersefunc(_ldtxt);
        }else {
            var _domlist = document.querySelectorAll('.mixselectSwiperInner');
            var _rtv = {};//返回值
            var _length = _domlist.length - 1;

            for (var i = 0; i <= _length; i++) {
                var _nlevel = 'level'+(i+1);
                var _list = _domlist[i];
                _rtv[_nlevel] = {};
                var _tsitem = _list.querySelector('.'+_scn);
                _rtv[_nlevel].value = _tsitem ? _tsitem.innerText.substr(0,_tsitem.innerText.length-1) : '';
                var _atts = _tsitem ? _tsitem.attributes : {};
                for(var k in _atts){
                    if(_atts[k].nodeName && _atts[k].nodeName !== 'class'){
                        _rtv[_nlevel][_atts[k].nodeName] = _atts[k].nodeValue;
                    }
                }
            };
            // _domlist.forEach(function(_list,_index){
            //     var _nlevel = 'level'+(_index+1);
            //     _rtv[_nlevel] = {};
            //     var _tsitem = _list.querySelector('.'+_scn);
            //     _rtv[_nlevel].value = _tsitem ? _tsitem.innerText : '';
            //     var _atts = _tsitem ? _tsitem.attributes : {};
            //     for(var k in _atts){
            //         if(_atts[k].nodeName && _atts[k].nodeName !== 'class'){
            //             _rtv[_nlevel][_atts[k].nodeName] = _atts[k].nodeValue;
            //         }
            //     }
            // });
            $('.mixselectMask').remove();
            _iparam();
            $('.mixselectMask').unbind('touchmove',preventDefault);
            _usersefunc(_rtv);
        }
    };

    var _ily = function(_y) {
        //判断是否是闰年
        if (_y % 100 === 0 && _y % 400 === 0) {
            return true;
        } else if (_y % 100 !== 0 && _y % 4 === 0) {
            return true;
        } else {
            return false;
        }
    }

    var _cda = function(_m, _y) { //获取当前月天数数组
        var _dn = 0;
        var _dna = [];
        if (_m == 1 || _m == 3 || _m == 5 || _m == 7 || _m == 8 || _m == 10 || _m == 12) {
            _dn = 31;
        } else if (_m == 4 || _m == 6 || _m == 9 || _m == 11) {
            _dn = 30;
        } else if (_m == 2 && _ily(_y)) {
            _dn = 29;
        } else {
            _dn = 28;
        }
        for(var i=1;i<=_dn;i++){
            _dna.push(i < 10 ? '0'+i : i);
        }
        return _dna;
    }

    var _cma = function() { //获取月数组
        return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    }

    var _fmd = function(_da){//字符串日期处理
        try {
            var date = !_da ? new Date() : new Date(_da);
            var yy = date.getFullYear();
            var mm = date.getMonth()+1 < 10 ? '0'+ (date.getMonth()+1) : date.getMonth()+1;
            var dd = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
            return {
                yy: yy,
                mm: mm,
                dd: dd
            }
        } catch (error) {
            if(_DEBUG_SWITCH) throw new Error('error date type');
            var date = new Date();
            var yy = date.getFullYear();
            var mm = date.getMonth()+1 < 10 ? '0'+ (date.getMonth()+1) : date.getMonth()+1;
            var dd = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
            return {
                yy: yy,
                mm: mm,
                dd: dd
            }
        }
    }

    var _cdv = function(_nd) { //构建日期数据
        // var _y = _fmd(_dyvm).yy - _dyfl;
        // var _ym = _fmd(_dyvm).yy + _dyfu;
        // var _nobj = _fmd(_nd);
        var _y = _fmd(_stday).yy;
        var _ym = _fmd(_eday).yy;
        var _nobj = _fmd(_nd);
        for(_y; _y<=_ym;_y++){
            _dva.year.push(_y);
        }
        _dva.month = _cma();
        _dva.day = _cda(_nobj.mm,_nobj.yy);
        return _nobj;
    }
    
    var _cdatefunc = function(_strarr,_sid,_lvl,_mk){//构建日历子dom树
        var _p = '';
        var styleStr = 'col-xs-4';
        var pd = '<div class="mixselectSwiperLevel{2} ' + styleStr + ' mixselectLevelPer"><div class="mixselectSwiperInner col-xs-12" {1}>{0}</div></div>';
        var cd = '<div class="mixselectSwiperItem {2}" {0}><span class="mixselectSwiperSpan">{1}</span></div>';
        var _sidd = parseInt(_sid,10);
        if(_lvl === 1 && _sidd > _fmd(_eday).yy){
            _sidd = _fmd(_eday).yy;
        };
        // if(_lvl === 1 && _sidd > _dyvm+_dyfu){
        //     _sidd = _dyvm+_dyfu;
        // };
        if(_lvl === 2 && _sidd > 12) {
            _sidd = 12;
        };
        if(_lvl === 3 && _sidd > parseInt(_strarr[_strarr.length - 1])){
            _sidd = _strarr[_strarr.length - 1];
        };
        _strarr.forEach(function(v,i){
            var _val = '';
            if(_lvl === 1){
                _val = v + '年';
            };
            if(_lvl === 2){
                _val = v + '月';
            };
            if(_lvl === 3){
                _val = v +'日';
            };
            _p += cd._f('index='+i,_val,parseInt(v,10) === parseInt(_sidd,10) ? _scn : '');
        });
        if(!_mk){
            pd = pd._f(_p, 'index='+_lvl, _lvl);
            return pd;
        }else {
            return _p;
        } 
    };

    var _rcvf = function(_v) { //传value的情况下，重构数据
        _v.forEach(function(_vl) {
            _rcv[_vl['id']] = _vl;
            if (_vl['sub'] && _vl['sub'].length > 0)
                _rcvf(_vl['sub']);
        });
    }
    //不支持x方向，axis无效
    var _gt = function(el, axis) {
        var matrix,
            curTransform,
            curStyle,
            transformMatrix;

        // 默认移动方向
        if (typeof axis === 'undefined') {
            axis = 'y';
        }

        curStyle = window.getComputedStyle(el, null);
        if (window.WebKitCSSMatrix) {
            // hack 老版本webkit
            transformMatrix = new WebKitCSSMatrix(curStyle.webkitTransform === 'none' ? '' : curStyle.webkitTransform);
        } else {
            transformMatrix = curStyle.MozTransform || curStyle.transform || curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
            matrix = transformMatrix.toString().split(',');
        }

        if (axis === 'y') {
            //兼容
            if (window.WebKitCSSMatrix)
                curTransform = transformMatrix.m42; //兼容
            else if (matrix.length === 16)
                curTransform = parseFloat(matrix[13]); //正常情况
            else
                curTransform = parseFloat(matrix[5]);
        }

        return curTransform || 0;
    };

    //原计划通过此方法提高动画效率，但没有class来的方便，暂时不采用
    // var _raf = function(callback) {     
    //     if (requestAnimationFrame) return requestAnimationFrame(callback);     
    //     else if (webkitRequestAnimationFrame) return webkitRequestAnimationFrame(callback);     
    //     else if (mozRequestAnimationFrame) return mozRequestAnimationFrame(callback);
    //     else {         
    //         return setTimeout(callback, 1000 / 60);     
    //     } 
    // }; 
    // var _caf = function(id) {     
    //     if (cancelAnimationFrame) return cancelAnimationFrame(id);
    //     else if (webkitCancelAnimationFrame) return webkitCancelAnimationFrame(id);     
    //     else if (mozCancelAnimationFrame) return mozCancelAnimationFrame(id);     
    //     else {        
    //         return clearTimeout(id);
    //     } 
    // };

    //设置transition
    var _trsi = function(dom, duration) {
        if (typeof duration !== 'string') {
            duration = duration + 'ms';
        }
        // for (var i = 0; i < dom.length; i++) {
        var elStyle = dom.style;
        elStyle.webkitTransitionDuration = elStyle.MozTransitionDuration = elStyle.transitionDuration = duration;
        // }
    };
    //获取差值倍数
    var _gni = function(_ntrs, _mtrs, _ith) {
        return -Math.round((_ntrs - _mtrs) / _ith);
    };
    //移动dom
    var _trfo = function(dom, transform) {
        // for (var i = 0; i < dom.length; i++) {
        var elStyle = dom ? dom.style : {};
        elStyle.webkitTransform = elStyle.MozTransform = elStyle.transform = transform;
        // }
    };
    //初始化日历scroll位置
    var _idpdate = function(_nobj){
        if(!_nobj)
            _nobj = _fmd();
        var lists = document.querySelectorAll('.mixselectSwiperInner');
        var _length = lists.length - 1;
        for (var i = 0; i <= _length; i++) {
            var _ntrs = 0;
            var _l = lists[i];
            if (!_l.querySelector('.' + _scn)) {
                _ntrs = _dftrmeter;
            } else {
                var index = _l.querySelector('.' + _scn).getAttribute('index');
                _ntrs = -index * _l._dataStorage.itemHeight + _l._dataStorage.maxTranslate;
            }
            // 移动wrapper
            _trfo(_l, 'translate3d(0,' + _ntrs + 'px,0)');
        };
        // lists.forEach(function(_l, _i) {
        //     var _ntrs = 0;
        //     if (!_l.querySelector('.' + _scn)) {
        //         _ntrs = _dftrmeter;
        //     } else {
        //         var index = _l.querySelector('.' + _scn).getAttribute('index');
        //         _ntrs = -index * _l._dataStorage.itemHeight + _l._dataStorage.maxTranslate;
        //     }
        //     // 移动wrapper
        //     _trfo(_l, 'translate3d(0,' + _ntrs + 'px,0)');
        // });
    };
    //初始化scroll位置
    var _idp = function(_si) {
        if (!_si)
            _si = [];
        var lists = document.querySelectorAll('.mixselectSwiperInner');
        var _length = lists.length - 1;
        for (var _i = 0; _i <= _length; _i++) {
            var _ntrs = 0;
            var _l = lists[i];
            if (!_si || !_si[_i] || _si[_i] === '')
                _si[_i] = '0';
            if (!_l.querySelector('.' + _scn)) {
                _ntrs = _dftrmeter;
            } else {
                var index = _l.querySelector('.' + _scn).getAttribute('index');
                _ntrs = -index * _l._dataStorage.itemHeight + _l._dataStorage.maxTranslate;
            }
            // 移动wrapper
            _trfo(_l, 'translate3d(0,' + _ntrs + 'px,0)');
        };
        // lists.forEach(function(_l, _i) {
        //     var _ntrs = 0;
        //     if (!_si || !_si[_i] || _si[_i] === '')
        //         _si[_i] = '0';
        //     if (!_l.querySelector('.' + _scn)) {
        //         _ntrs = _dftrmeter;
        //     } else {
        //         var index = _l.querySelector('.' + _scn).getAttribute('index');
        //         _ntrs = -index * _l._dataStorage.itemHeight + _l._dataStorage.maxTranslate;
        //     }
        //     // 移动wrapper
        //     _trfo(_l, 'translate3d(0,' + _ntrs + 'px,0)');
        // });
    };
    //更新子item
    var _udi = function(_index, _dom) {
        var items = _dom.querySelectorAll('.mixselectSwiperItem');
        var _scnode = _dom.querySelector('.' + _scn);
        if (_index < 0)
            _index = 0;
        if (_index >= items.length)
            _index = items.length - 1;
        _scnode && _scnode.classList.remove(_scn);
        items[_index] && items[_index].classList.add(_scn);
    };
    //创建子dom树
    var _cct = function(id, _nl) {
        var subv = _rcv[id] && _rcv[id]['sub'] && _rcv[id]['sub'].length > 0 ? _rcv[id]['sub'] : [];
        var nid = 0;
        var $nl = $(_nl).find('.mixselectSwiperInner');
        $nl.empty();
        if (subv.length > 0) {
            var cd = '<div class="mixselectSwiperItem {2}" {0}><span class="mixselectSwiperSpan">{1}</' + 'span></div>';
            var nds = '';
            subv.forEach(function(_v, _in) {
                var __cp = '';
                for (var _k in _v) {
                    if (_k !== 'sub')
                        __cp += ' ' + _k + '=' + _v[_k];
                }
                if (_in === 0) {
                    nid = _v['id'];
                    nds += cd._f(__cp + ' index=' + _in, _v['txt'], _scn);
                } else
                    nds += cd._f(__cp + ' index=' + _in, _v['txt'], '');
            });
            $nl.html(nds);
            _trfo($nl[0], 'translate3d(0,60px,0)');
        }
        var nlnext = $(_nl).next('.mixselectLevelPer');
        if (nlnext.length > 0) {
            _cct(nid, nlnext[0]);
        }
    };
    //刷新子dom树 datepicker
    var _rfchildate = function(_index,_dom,_tp){
        var _domd = document.querySelector('.mixselectSwiperLevel3');
        var _domdinner = _domd.querySelector('.mixselectSwiperInner');
        var _ny = _tp === 'year' ? $(_dom).find('.mixselectSwiperItem[index="'+_index+'"] .mixselectSwiperSpan').text().replace(/[\u4e00-\u9fa5]/,'') : $('.mixselectSwiperLevel1 .'+_scn+' .mixselectSwiperSpan').text().replace(/[\u4e00-\u9fa5]/,'');
        var _nm = _tp === 'month' ? $(_dom).find('.mixselectSwiperItem[index="'+_index+'"] .mixselectSwiperSpan').text().replace(/[\u4e00-\u9fa5]/,'') : $('.mixselectSwiperLevel2 .'+_scn+' .mixselectSwiperSpan').text().replace(/[\u4e00-\u9fa5]/,'');
        var _nd = $('.mixselectSwiperLevel3 .'+_scn+' .mixselectSwiperSpan').text().replace(/[\u4e00-\u9fa5]/,'');
        var _nda = _cda(_nm,_ny);
        var _itemd = _cdatefunc(_nda, _nd ,3,true);
        $('.mixselectSwiperLevel3').find('.mixselectSwiperInner').empty().append(_itemd);
        _initWrapperParam(false);
        var _ntly = _domdinner.style.transform.split(',')[1] ? parseInt(_domdinner.style.transform.split(',')[1],10) : '0';
        var _maxt = _domdinner._dataStorage.maxTranslate;
        var _mint = _domdinner._dataStorage.minTranslate;
        if(_ntly > _maxt)
            _trfo(_domdinner, 'translate3d(0,' + _maxt + 'px,0)');
        else if(_ntly < _mint)
            _trfo(_domdinner, 'translate3d(0,' + _mint + 'px,0)');
        // var _ntrs = -_index * _domdinner._dataStorage.itemHeight + _domdinner._dataStorage.maxTranslate;
        // _trfo(_domd, 'translate3d(0,' + _ntrs + 'px,0)');
    };
    //刷新子dom树
    var _rfchild = function(_index, _dom) {
        var item = _dom.querySelectorAll('.mixselectSwiperItem');
        if (!item || item.length <= 0)
            return false;
        if (_index < 0)
            _index = 0;
        if (_index > _index.length - 1)
            _index = _index.length - 1;
        var id = item[_index] && item[_index].getAttribute('id');
        var _nl = $(_dom).parent().next();
        _cct(id, _nl);
        _initWrapperParam(false);
    };
    //初始化wrapper参数
    var _initWrapperParam = function(_mk, _rt) {
        // if (!_mk) return false;
        var _sa = document.querySelector(_sc).querySelectorAll('.mixselectSwiperInner');
        for(var i=0;i<=_sa.length-1;i++){
            var _dom = _sa[i];
            var client = _dom.parentNode;
            var swiper = _dom;
            var items = _dom.querySelectorAll('.mixselectSwiperItem');
            swiper._dataStorage = {};
            swiper._dataStorage.clientHeight = clientHeight = client.offsetHeight;
            swiper._dataStorage.wrapperHeight = wrapperHeight = swiper.offsetHeight;
            swiper._dataStorage.itemHeight = itemHeight = items[0] ? items[0].offsetHeight : 30;
            swiper._dataStorage.itemsHeight = itemsHeight = itemHeight * items.length;
            swiper._dataStorage.minTranslate = clientHeight / 2 - itemsHeight + itemHeight / 2;
            swiper._dataStorage.maxTranslate = clientHeight / 2 - itemHeight / 2;
            //------------------------------------------------------------------
            _mk && _rt.__iev(_dom);
        }
        // _sa.forEach(function(_dom, index) {
        //     //初始化参数,在dom的_dataStorage下--------------------------------------------------------
        //     var client = _dom.parentNode;
        //     var swiper = _dom;
        //     var items = _dom.querySelectorAll('.mixselectSwiperItem');
        //     swiper._dataStorage = {};
        //     swiper._dataStorage.clientHeight = clientHeight = client.offsetHeight;
        //     swiper._dataStorage.wrapperHeight = wrapperHeight = swiper.offsetHeight;
        //     swiper._dataStorage.itemHeight = itemHeight = items[0] ? items[0].offsetHeight : 30;
        //     swiper._dataStorage.itemsHeight = itemsHeight = itemHeight * items.length;
        //     swiper._dataStorage.minTranslate = clientHeight / 2 - itemsHeight + itemHeight / 2;
        //     swiper._dataStorage.maxTranslate = clientHeight / 2 - itemHeight / 2;
        //     //------------------------------------------------------------------
        //     _mk && _rt.__iev(_dom);
        // });
        // !_mk && _idp(_dom);
    };
    //初始化递归创建dom树
    //__ie是否递归到底
    s.prototype._c = function(_v, _si, _l, _ie, _sd, _depth) {
        if (!_l)
            _l = 1;
        if (!_sd)
            _sd = '';
        var styleStr = 'col-xs-' + 12 / _depth;
        var pd = '<div class="mixselectSwiperLevel' + _l + ' ' + styleStr + ' mixselectLevelPer"><div class="mixselectSwiperInner col-xs-12" {1}>{0}</div></div>';
        var cd = '<div class="mixselectSwiperItem {2}" {0}><span class="mixselectSwiperSpan">{1}</span></div>';
        var _p = '';
        var _nv = []; //子数组，这里是sub
        var __r = this;
        _v.forEach(function(_i, _in) {
            var __cp = '';
            for (var _k in _i) {
                if (_k !== 'sub')
                    __cp += ' ' + _k + '=' + _i[_k];
            }
            if (_i['id'] && _i['id'] === _si[_l - 1]) {
                _nv = _i['sub'];
                _p += cd._f(__cp + ' index=' + _in, _i['txt'], _scn);
            } else {
                _p += cd._f(__cp + ' index=' + _in, _i['txt'], '');
            }
        });
        pd = _sd + pd._f(_p, 'index=' + _l);
        callbackDepth++;//递归深度
        if (_ie && _nv && _nv.length > 0 && _depth > callbackDepth) {
            return __r._c(_nv, _si, _l + 1, true, pd, _depth);
        } else {
            if (_depth > callbackDepth) {
                for (var x = 0; x < _depth - callbackDepth; x++) {
                    pd += '<div class="mixselectSwiperLevel' + (callbackDepth + x + 1) + ' ' + styleStr + ' mixselectLevelPer"><div class="mixselectSwiperInner col-xs-12" index="' + (callbackDepth + x + 1) + '"><div class="mixselectSwiperItem"><span class="mixselectSwiperSpan"></span></di' +
                        'v></div></div>';
                }
            }
            if(_DEBUG_SWITCH) console.timeEnd && console.timeEnd();//查看递归执行时间，递归是影响效率主因，但暂时没有更好的方式替换。或许换一种数据结构？？但针对城市控件没法采用别的结构，不影响日历控件，日历控件不走递归。
            return pd;
        }
    };

    //构建date子item树
    s.prototype._cdate = function(_nobj){
        var _ya = _dva.year;
        var _ym = _dva.month;
        var _yd = _dva.day;
        var _p = '';
        var _innerpa = [_ya,_ym,_yd];
        var _innerpd = [_nobj.yy,_nobj.mm,_nobj.dd];
        for(var i=0;i<3;i++){
            _p += _cdatefunc(_innerpa[i],_innerpd[i],i+1);
        }
        return _p;
    };
    //初始化中间方法
    s.prototype._ic = function(_v, _si, _depth) {
        var __r = this;
        if(_DEBUG_SWITCH) console.time && console.time();
        var pd = __r._c(_v, _si, 1, true, '', _depth);
        return pd;
    };
    //初始化中间方法
    s.prototype._icdate = function(){
        var __r = this;
        var pd = __r._cdate(arguments[3]);
        return pd;
    };
    //初始化绑定事件
    s.prototype._iboote = function(){
        $('.mixselectTitleCancelBtn').one('click',_cefunc);
        $('.mixselectCloseBtn').one('click',_sefunc);
        if(_localType === 'datepicker' && _isenddate === '1'){
            $('.mixselectEndDateCheckBox').on('click',function(e){
                var _r = $(this);
                if(_r.hasClass('endDateChecked')){
                    _r.removeClass('endDateChecked').addClass('endDateNoChecked');
                }else {
                    _r.removeClass('endDateNoChecked').addClass('endDateChecked');
                }
            });
        }
        $('.mixselectMask').unbind('touchmove').bind('touchmove',preventDefault);
    }
    //初始化touch事件集合
    s.prototype.__iev = function(_dom) {
        var _r = this;
        var _wp = _dom;
        var _its = _dom.querySelectorAll('.mixselectSwiperItem');
        _wp.addEventListener('touchstart', _r._ots, false);
        _wp.addEventListener('touchmove', _r._otm, false);
        _wp.addEventListener('touchend', _r._ote, false);
    }
    //初始化
    s.prototype._init = function(_si,_tp,_nobj) {
        _initWrapperParam(true, this);
        //初始化位置
        _tp === 'datepicker' ? _idpdate(_nobj) : _idp(_si);
        document.querySelector('.mixselectMask').classList.add('showMixSelect');
        document.querySelector(_sc).classList.add('showMixSelect');
    };

    //初始化select dom树
    s.prototype._i = function(_v, _si, _ds, _depth,t,tp,_nobj,_ilc) {
        var __r = this;
        var _acfn = {
            'diy': '_ic',
            'datepicker': '_icdate'
        };
        var d = '<div class="mixselectMask"><div class="mixselectContent col-xs-12"><div class="mixselectTitle col-xs-12"><span class="mixselectTitleCancelBtn">'+_lbtntxt+'</span><span class="mixselectTitleSpan">'+t+'</span><div class="mixselectCloseBtn">'+_rbtntxt+'</div></div><div class="mixselectSwiperTank col-xs-12">{0}<div class="mixselectTopMask"></div><div class="mixselectCeterHighlight col-xs-12"></div><div class="mixselectBottomMask"></div></div>{1}</div>';
        var cbs = _ilc === '1' ? 'endDateChecked' : 'endDateNoChecked';
        var edstr = '<div class="mixselectEndDateBottomDiv col-xs-12"><div class="mixselectEndDateCheckBox '+ cbs +'"></div><div class="mixselectEndDateTipDiv"><span class="mixselectEndDateTipSpan">'+_edtiptxt+'</span></div></div></div>';
        var _pd = __r[_acfn[tp]](_v, _si, _depth,_nobj);
        var _d = tp === 'datepicker' && _isenddate === '1' ? d._f(_pd,edstr) : d._f(_pd,'');
        $(_ds).append(_d);
        //特殊处理结束日期选择框checkbox位置
        if(tp === 'datepicker' && _isenddate === '1'){
            var offset = $('.mixselectSwiperItemSelected')[0] && $($('.mixselectSwiperItemSelected')[0]).find('.mixselectSwiperSpan').length > 0 ? $($('.mixselectSwiperItemSelected')[0]).find('.mixselectSwiperSpan').offset() : {};
            if(offset.left && offset.left !== '')
                $('.mixselectEndDateBottomDiv').css('padding-left',offset.left+'px');
        }
        // HTMLElement.prototype._dataStorage = {}; 
        // param-------------------------------------------------------- var client =
        // document.querySelector('.mixselectLevelPer'); var swiper =
        // document.querySelector('.mixselectSwiperInner'); var items =
        // swiper.querySelectorAll('.mixselectSwiperItem'); clientHeight =
        // client.offsetHeight; wrapperHeight = swiper.offsetHeight; itemHeight =
        // items[0].offsetHeight; itemsHeight = itemHeight * items.length; minTranslate
        // = clientHeight / 2 - itemsHeight + itemHeight / 2; maxTranslate =
        // clientHeight / 2 - itemHeight / 2;
        // fastclick是造成卡顿的主要原因，放弃fastclick//------------------------------------------------------------------
        // fastclick 掌控控件touch事件 f.attach(document.querySelector(_sc));
        __r._init(_si,tp,_nobj);
        __r._iboote();
    };
    //touchstart事件handle方法
    s.prototype._ots = function(e) {
        var _r = this;
        if (isMoved || isTouched)
            return;
        e.preventDefault();
        isTouched = true;
        touchStartY = touchCurrentY = e.targetTouches[0].pageY;
        touchStartTime = (new Date()).getTime();
        startTranslate = currentTranslate = _gt(_r, 'y');
    }
    //touchmove事件handle方法
    s.prototype._otm = function(e) {
        if (!isTouched)
            return;
        var _r = this;
        e.preventDefault();
        touchCurrentY = e.targetTouches[0].pageY;
        if (!isMoved) {
            isMoved = true;
            startTranslate = currentTranslate = _gt(_r, 'y');
            _trsi(e.currentTarget, 0);
        }
        var diff = touchCurrentY - touchStartY;
        currentTranslate = startTranslate + diff;
        returnTo = undefined;
        var minTranslate = e.currentTarget._dataStorage.minTranslate,
            maxTranslate = e.currentTarget._dataStorage.maxTranslate,
            itemHeight = e.currentTarget._dataStorage.itemHeight;
        // 边界滚动控制
        if (currentTranslate < minTranslate) {
            currentTranslate = minTranslate - Math.pow(minTranslate - currentTranslate, 0.8);
            returnTo = 'min';
        }
        if (currentTranslate > maxTranslate) {
            currentTranslate = maxTranslate + Math.pow(currentTranslate - maxTranslate, 0.8);
            returnTo = 'max';
        }
        // 移动wrapper
        _trfo(e.currentTarget, 'translate3d(0,' + currentTranslate + 'px,0)');

        // 选择的index
        var activeIndex = _gni(currentTranslate, maxTranslate, itemHeight);

        // 更新item样式
        _udi(activeIndex, e.currentTarget);

        if(_localType === 'datepicker'){
            var _nowoi = _r.getAttribute('index');
            if(_nowoi === '2') _rfchildate(activeIndex, e.currentTarget,'month');
            else if(_nowoi === '1') _rfchildate(activeIndex, e.currentTarget,'year');
        }else {
            //更新 子item
            _rfchild(activeIndex, e.currentTarget);
        }
        // 计算时间
        velocityTranslate = currentTranslate - prevTranslate || currentTranslate;
        velocityTime = (new Date()).getTime();
        prevTranslate = currentTranslate;
    }
    //touchend事件handle方法
    s.prototype._ote = function(e) {
        if (!isTouched || !isMoved) {
            isTouched = isMoved = false;
            return;
        }
        var _r = this;
        isTouched = isMoved = false;
        _trsi(e.currentTarget, '');
        var minTranslate = e.currentTarget._dataStorage.minTranslate,
            maxTranslate = e.currentTarget._dataStorage.maxTranslate,
            itemHeight = e.currentTarget._dataStorage.itemHeight;
        if (returnTo) {
            if (returnTo === 'min') {
                _trfo(e.currentTarget, 'translate3d(0,' + minTranslate + 'px,0)');
            } else
                _trfo(e.currentTarget, 'translate3d(0,' + maxTranslate + 'px,0)');
        }
        touchEndTime = new Date().getTime();
        var velocity,
            newTranslate;
        if (touchEndTime - touchStartTime > 300) {
            newTranslate = currentTranslate;
        } else {
            velocity = Math.abs(velocityTranslate / (touchEndTime - velocityTime));
            newTranslate = currentTranslate + velocityTranslate * momentumRatio;
        }

        newTranslate = Math.max(Math.min(newTranslate, maxTranslate), minTranslate);

        //当前active index
        var activeIndex = _gni(newTranslate, maxTranslate, itemHeight);

        //获取马上需要移动的translate
        newTranslate = -activeIndex * itemHeight + maxTranslate;

        //移动wrapper
        _trfo(e.currentTarget, 'translate3d(0,' + (parseInt(newTranslate, 10)) + 'px,0)');

        //更新item树
        _udi(activeIndex, e.currentTarget);

        if(_localType === 'datepicker'){
            var _nowoi = _r.getAttribute('index');
            if(_nowoi === '2') _rfchildate(activeIndex, e.currentTarget,'month');
            else if(_nowoi === '1') _rfchildate(activeIndex, e.currentTarget,'year');
        }else {
            //更新 子item
            _rfchild(activeIndex, e.currentTarget);
        }

    }
    return s;
});

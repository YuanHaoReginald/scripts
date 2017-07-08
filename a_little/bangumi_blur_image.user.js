// ==UserScript==
// @name        bangumi blur image 
// @namespace   https://github.com/22earth
// @description a tool for bluring image before upload
// @include     /^https?:\/\/(bangumi|bgm|chii)\.(tv|in)\/.*(upload_img|new)$/
// @updateURL   https://raw.githubusercontent.com/bangumi/scripts/master/a_little/bangumi_blur_image.user.js
// @grant       GM_addStyle
// @require     https://raw.githubusercontent.com/flozz/StackBlur/master/dist/stackblur.min.js
// @version     0.2.2
// @note        0.2 add loading and main entry function
// ==/UserScript==

;(function() {
  function addInputFile($target) {
    var $input = document.createElement('input');
    $input.type = 'file';
    if ($target) {
      $target.parentElement.insertBefore($input, $target.nextElementSibling);
    }
  }
  function addStyle(css) {
    if (css) {
      GM_addStyle(css);
    } else {
      GM_addStyle([
        '#amount { padding-left: 10px; border: 0; color: #f6931f; font-size: 20px; font-weight: bold; }',
        '#reset { display: inline-block; text-align: center; width: 60px; height: 30px; line-height: 30px; font-size: 18px; background-color: #f09199; text-decoration: none; color: #fff; margin-left: 50px; margin-bottom: 30px; border-radius: 5px; box-shadow:1px 1px 2px #333; }',
        'canvas:active { cursor: crosshair; }',
        '#preview { display: block; }',
        '.blur-loading { width: 208px; height: 13px; background-image: url("/img/loadingAnimation.gif"); }'
      ].join(''));
    }
  }
  function insertBlurInfo($target) {
    const rawHTML = `
    <label for="amount">Blur width and radius:</label>
    <input id="amount" type="text" readonly>
    <br>
    <input id="slider-width" type="range" value="20" name="width" min="1" max="100"><canvas></canvas>
    <br>
    <input id="slider-radius" type="range" value="10" name="radius" min="1" max="100">
    <br>
    <a href="#" id="reset">reset</a>
  `;
    var $info = document.createElement('div');
    $info.classList.add('blur-info');
    $info.innerHTML = rawHTML;
    if ($target) {
      $target.parentElement.insertBefore($info, $target.nextElementSibling);
    }
  }
  function changeInfo($width, $radius) {
    var $info = document.querySelector('#amount');
    var radius = $radius.value;
    var width = $width.value;
    $info.value = width + ', ' + radius;
  }
  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
      y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
    };
  }
  function drawRec($width) {
    var $canvas = $width.nextElementSibling;
    var ctx = $canvas.getContext('2d');
    var width = Number($width.value);
    $canvas.width = width * 1.4;
    $canvas.height = width * 1.4;
    ctx.strokeStyle = '#f09199';
    ctx.strokeRect(0.2 * width, 0.2 * width, width, width);
    window.dispatchEvent(new Event('resize'));
  }
  function previewFile($file, $blurInfo) {
    //var $file = document.querySelector('input[type = file]')
    var $canvas = document.createElement('canvas');
    var $radius = $blurInfo.querySelector('#slider-radius');
    var $width = $blurInfo.querySelector('#slider-width');
    $canvas.id = 'preview';
    $canvas.width = 8;
    $canvas.height = 10;
    var ctx = $canvas.getContext('2d');
    $blurInfo.insertBefore($canvas, $blurInfo.firstChild);
    var $img = new Image();
    $img.addEventListener('load', function () {
      $canvas.width = $img.width;
      $canvas.height = $img.height;
      ctx.drawImage($img, 0, 0);
      window.dispatchEvent(new Event('resize'));  // let img cut tool at right position
    }, false);
    blur($canvas);
    $file.addEventListener('change', loadImgData, false);

    function blur(el) {
      var isDrawing;
      var ctx = el.getContext('2d');
      el.onmousedown = function (e) {
        isDrawing = true;
        var pos = getMousePos(el, e);
        ctx.moveTo(pos.x, pos.y);
      };
      el.onmousemove = function (e) {
        if (isDrawing) {
          //ctx.lineTo(e.layerX, e.layerY);
          //ctx.stroke();
          var radius = Number($radius.value);
          var width = Number($width.value);
          var pos = getMousePos(el, e);
          StackBlur.canvasRGBA(el, pos.x - width / 2, pos.y - width / 2, width, width, radius);
        }
      };
      el.onmouseup = function () {
        isDrawing = false;
      };
    }
    function loadImgData() {
      var file = $file.files[0];
      var reader = new FileReader();
      reader.addEventListener('load', function () {
        $img.src = reader.result;
      }, false);
      if (file) {
        reader.readAsDataURL(file);
      }
    }
    document.querySelector('#reset').addEventListener('click', function (e) {
      e.preventDefault()
      var file = $file.files[0];
      var $fillForm = document.querySelector('.fill-form');
      if (file) {
        $file.dispatchEvent(new Event('change'));
      } else if ($fillForm) {
        $fillForm.dispatchEvent(new Event('click'));
      }
    });
  }

  function sendFormDataPic($form, dataURL) {
    var genString = Array.apply(null, Array(5)).map(function(){
      return (function(charset){
        return charset.charAt(Math.floor(Math.random()*charset.length));
      }('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'));
    }).join('');
    function dataURItoBlob(dataURI) {
      // convert base64/URLEncoded data component to raw binary data held in a string
      var byteString;
      if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
      else
        byteString = decodeURI(dataURI.split(',')[1]);  // instead of unescape
      // separate out the mime component
      var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
      // write the bytes of the string to a typed array
      var ia = new Uint8Array(byteString.length);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ia], {type:mimeString});
    }
    function dataURLtoFile(dataurl, filename) {
      var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while(n--){
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, {type:mime});
    }
    // loading effect
    var $submit = $form.querySelector('[type=submit]');
    $submit.style.display = 'none';
    var $loading = document.createElement('div');
    $loading.classList.add('blur-loading');
    var $blurInfo = document.querySelector('.blur-info');
    $form.parentElement.insertBefore($loading, $blurInfo);
    // ajax 
    var fd = new FormData($form);
    var $file = $form.querySelector('input[type=file]');
    var inputFileName = $file.name ? $file.name : 'picfile';
    fd.set(inputFileName, dataURItoBlob(dataURL), genString + '.png');
    if (location.href.match(/new$/)) {
      fd.set('submit', '添加新人物');
    }
    var xhr = new XMLHttpRequest();
    xhr.open($form.method.toLowerCase(), $form.action, true);
    xhr.onreadystatechange = function () {
      var _location;
      //console.log(xhr);
      if(xhr.readyState === 2 && xhr.status === 200){
        _location = xhr.responseURL;
        $loading.style.display = 'none';
        $submit.style.display = '';
        if(_location) {
          location.assign(_location);
        }
      }
    };
    xhr.send(fd);
    // clone form submit
    /*
     *var $cloneForm = $form.cloneNode(true)
     *var $file = $cloneForm.querySelector('input[type=file]')
     *$file.files[0] = dataURLtoFile(dataURL, genString + '.png')
     */
  }

  function init() {
    // gm init dom
    addStyle();
    var fs = [].slice.call(document.forms).filter(function(elem) {
      return elem.querySelector('input[type=file]');
    });
    insertBlurInfo(fs[0]);  // end add dom and css
    // blur
    var $radius = document.querySelector('#slider-radius');
    var $width = document.querySelector('#slider-width');
    window.addEventListener('load', function (e) {
      drawRec($width);
      changeInfo($width, $radius);
    }, false);
    var $file = document.querySelector('input[type = file]');
    var $blurInfo = document.querySelector('.blur-info');
    $blurInfo.addEventListener('change', function(e) {
      if (e.target.tagName.toLowerCase() === 'input') {
        changeInfo($width, $radius);
      }
      if (e.target.name === 'width') {
        drawRec($width);
      }
    }, false);
    previewFile($file, $blurInfo);

    fs.length && fs[0].addEventListener('submit', function (e) {
      var $canvas = document.querySelector('#preview');
      if (!$canvas) {
        return undefined;
      }
      if ($canvas.width === 8 && $canvas.height === 10) {
        return undefined;
      }
      e.preventDefault();
      var dataURL = document.querySelector('#preview').toDataURL('image/png', 1);
      sendFormDataPic(this, dataURL);
    }, false);
  }

  init();
}());

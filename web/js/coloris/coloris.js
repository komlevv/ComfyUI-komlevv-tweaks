/*!
 * Copyright (c) 2021 Momo Bassit.
 * Licensed under the MIT License (MIT)
 * https://github.com/mdbassit/Coloris
 */

((window, document, Math, undefined) => {
  const ctx = document.createElement('canvas').getContext('2d');
  const currentColor = { r: 0, g: 0, b: 0, h: 0, s: 0, v: 0, a: 1 };
  let picker, colorArea, colorMarker, colorPreview, colorValue, clearButton, closeButton,
      hueSlider, hueMarker, alphaSlider, alphaMarker, currentEl, currentFormat, oldColor,
      colorAreaDims = {};

  const settings = {
    el: '[data-coloris]',
    theme: 'default',
    themeMode: 'light',
    margin: 2,
    format: 'hex',
    formatToggle: false,
    swatches: [],
    swatchesOnly: false,
    alpha: true,
    forceAlpha: false,
    focusInput: true,
    selectInput: false,
    clearButton: false,
    clearLabel: 'Clear',
    closeButton: false,
    closeLabel: 'Close',
    onChange: () => undefined,
    a11y: {
      open: 'Open color picker',
      close: 'Close color picker',
      clear: 'Clear the selected color',
      marker: 'Saturation: {s}. Brightness: {v}.',
      hueSlider: 'Hue slider',
      alphaSlider: 'Opacity slider',
      input: 'Color value field',
      format: 'Color format',
      swatch: 'Color swatch',
      instruction: 'Saturation and brightness selector.'
    }
  };

  function ensureInit() {
    if (picker) {
      return picker;
    }

    init();
    return picker;
  }

  function configure(options) {
    ensureInit();

    if (typeof options !== 'object') {
      return;
    }

    for (const key in options) {
      switch (key) {
        case 'el':
          bindFields(options.el);
          break;
        case 'themeMode':
          settings.themeMode = options.themeMode;
          if (options.themeMode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            settings.themeMode = 'dark';
          }
        case 'theme':
          if (options.theme) {
            settings.theme = options.theme;
          }
          picker.className = `clr-picker clr-${settings.theme} clr-${settings.themeMode}`;
          break;
        case 'margin':
          options.margin *= 1;
          settings.margin = !isNaN(options.margin) ? options.margin : settings.margin;
          break;
        case 'formatToggle':
          settings.formatToggle = !!options.formatToggle;
          getEl('clr-format').style.display = settings.formatToggle ? 'block' : 'none';
          if (settings.formatToggle) {
            settings.format = 'auto';
          }
          break;
        case 'swatches':
          if (Array.isArray(options.swatches)) {
            const swatchesContainer = getEl('clr-swatches');
            const swatches = document.createElement('div');

            swatchesContainer.textContent = '';

            options.swatches.forEach((swatch, i) => {
              const button = document.createElement('button');
              button.setAttribute('type', 'button');
              button.setAttribute('id', `clr-swatch-${i}`);
              button.setAttribute('aria-labelledby', `clr-swatch-label clr-swatch-${i}`);
              button.style.color = swatch;
              button.textContent = swatch;
              swatches.appendChild(button);
            });

            if (options.swatches.length) {
              swatchesContainer.appendChild(swatches);
            }

            settings.swatches = options.swatches.slice();
          }
          break;
        case 'swatchesOnly':
          settings.swatchesOnly = !!options.swatchesOnly;
          picker.setAttribute('data-minimal', settings.swatchesOnly);
          break;
        case 'alpha':
          settings.alpha = !!options.alpha;
          picker.setAttribute('data-alpha', settings.alpha);
          break;
        case 'clearButton':
          if (typeof options.clearButton === 'object') {
            if (options.clearButton.label) {
              settings.clearLabel = options.clearButton.label;
              clearButton.innerHTML = settings.clearLabel;
            }
            options.clearButton = options.clearButton.show;
          }
          settings.clearButton = !!options.clearButton;
          clearButton.style.display = settings.clearButton ? 'block' : 'none';
          break;
        case 'clearLabel':
          settings.clearLabel = options.clearLabel;
          clearButton.innerHTML = settings.clearLabel;
          break;
        case 'closeButton':
          settings.closeButton = !!options.closeButton;
          if (settings.closeButton) {
            picker.insertBefore(closeButton, colorPreview);
          } else {
            colorPreview.appendChild(closeButton);
          }
          break;
        case 'closeLabel':
          settings.closeLabel = options.closeLabel;
          closeButton.innerHTML = settings.closeLabel;
          break;
        case 'a11y': {
          const labels = options.a11y;
          let update = false;

          if (typeof labels === 'object') {
            for (const label in labels) {
              if (labels[label] && settings.a11y[label]) {
                settings.a11y[label] = labels[label];
                update = true;
              }
            }
          }

          if (update) {
            const openLabel = getEl('clr-open-label');
            const swatchLabel = getEl('clr-swatch-label');

            openLabel.innerHTML = settings.a11y.open;
            swatchLabel.innerHTML = settings.a11y.swatch;
            closeButton.setAttribute('aria-label', settings.a11y.close);
            clearButton.setAttribute('aria-label', settings.a11y.clear);
            hueSlider.setAttribute('aria-label', settings.a11y.hueSlider);
            alphaSlider.setAttribute('aria-label', settings.a11y.alphaSlider);
            colorValue.setAttribute('aria-label', settings.a11y.input);
            colorArea.setAttribute('aria-label', settings.a11y.instruction);
          }
          break;
        }
        default:
          settings[key] = options[key];
      }
    }
  }

  function bindFields(selector) {
    if (selector instanceof HTMLElement) {
      selector = [selector];
    }

    if (Array.isArray(selector)) {
      selector.forEach(field => {
        addListener(field, 'click', openPicker);
      });
    } else {
      addListener(document, 'click', selector, openPicker);
    }
  }

  function openPicker(event) {
    currentEl = event.target;
    oldColor = currentEl.value;
    currentFormat = getColorFormatFromStr(oldColor);
    picker.style.display = 'flex';
    picker.classList.add('clr-open');

    updatePickerPosition();
    setColorFromStr(oldColor);

    if (settings.focusInput || settings.selectInput) {
      colorValue.focus({ preventScroll: true });
      colorValue.setSelectionRange(currentEl.selectionStart, currentEl.selectionEnd);
    }

    if (settings.selectInput) {
      colorValue.select();
    }

    currentEl.dispatchEvent(new Event('open', { bubbles: false }));
  }

  function updatePickerPosition() {
    const scrollY = window.scrollY;
    const coords = currentEl.getBoundingClientRect();
    const pickerWidth = picker.offsetWidth;
    const pickerHeight = picker.offsetHeight;
    const reposition = { left: false, top: false };
    let left = coords.x;
    let top = scrollY + coords.y + coords.height + settings.margin;

    if (left + pickerWidth > document.documentElement.clientWidth) {
      left += coords.width - pickerWidth;
      reposition.left = true;
    }

    if (top + pickerHeight - scrollY > document.documentElement.clientHeight) {
      if (pickerHeight + settings.margin <= coords.top) {
        top = scrollY + coords.y - pickerHeight - settings.margin;
        reposition.top = true;
      }
    }

    picker.classList.toggle('clr-left', reposition.left);
    picker.classList.toggle('clr-top', reposition.top);
    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;

    colorAreaDims = {
      width: colorArea.offsetWidth,
      height: colorArea.offsetHeight,
      x: colorArea.offsetLeft + picker.offsetLeft,
      y: colorArea.offsetTop + picker.offsetTop
    };
  }

  function closePicker(revert) {
    if (currentEl) {
      const prevEl = currentEl;

      if (revert) {
        currentEl = undefined;

        if (oldColor !== prevEl.value) {
          prevEl.value = oldColor;
          prevEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      setTimeout(() => {
        if (oldColor !== prevEl.value) {
          prevEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      picker.classList.remove('clr-open');
      picker.style.display = 'none';
      prevEl.dispatchEvent(new Event('close', { bubbles: false }));

      if (settings.focusInput) {
        prevEl.focus({ preventScroll: true });
      }

      currentEl = undefined;
    }
  }

  function setColorFromStr(str) {
    const rgba = strToRGBA(str);
    const hsva = RGBAtoHSVA(rgba);

    updateMarkerA11yLabel(hsva.s, hsva.v);
    updateColor(rgba, hsva);

    hueSlider.value = hsva.h;
    picker.style.color = `hsl(${hsva.h}, 100%, 50%)`;
    hueMarker.style.left = `${hsva.h / 360 * 100}%`;

    colorMarker.style.left = `${colorAreaDims.width * hsva.s / 100}px`;
    colorMarker.style.top = `${colorAreaDims.height - (colorAreaDims.height * hsva.v / 100)}px`;

    alphaSlider.value = hsva.a * 100;
    alphaMarker.style.left = `${hsva.a * 100}%`;
  }

  function getColorFormatFromStr(str) {
    const format = str.substring(0, 3).toLowerCase();
    if (format === 'rgb' || format === 'hsl') {
      return format;
    }
    return 'hex';
  }

  function pickColor(color) {
    color = color !== undefined ? color : colorValue.value;

    if (currentEl) {
      currentEl.value = color;
      currentEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (settings.onChange) {
      settings.onChange.call(window, color, currentEl);
    }

    document.dispatchEvent(new CustomEvent('coloris:pick', { detail: { color, currentEl } }));
  }

  function setColorAtPosition(x, y) {
    const hsva = {
      h: hueSlider.value * 1,
      s: x / colorAreaDims.width * 100,
      v: 100 - (y / colorAreaDims.height * 100),
      a: alphaSlider.value / 100
    };
    const rgba = HSVAtoRGBA(hsva);

    updateMarkerA11yLabel(hsva.s, hsva.v);
    updateColor(rgba, hsva);
    pickColor();
  }

  function updateMarkerA11yLabel(saturation, value) {
    let label = settings.a11y.marker;
    saturation = saturation.toFixed(1) * 1;
    value = value.toFixed(1) * 1;
    label = label.replace('{s}', saturation);
    label = label.replace('{v}', value);
    colorMarker.setAttribute('aria-label', label);
  }

  function getPointerPosition(event) {
    return {
      pageX: event.pageX,
      pageY: event.pageY
    };
  }

  function moveMarker(event) {
    const pointer = getPointerPosition(event);
    let x = pointer.pageX - colorAreaDims.x;
    let y = pointer.pageY - colorAreaDims.y;

    setMarkerPosition(x, y);
    event.preventDefault();
    event.stopPropagation();
  }

  function setMarkerPosition(x, y) {
    x = (x < 0) ? 0 : (x > colorAreaDims.width) ? colorAreaDims.width : x;
    y = (y < 0) ? 0 : (y > colorAreaDims.height) ? colorAreaDims.height : y;

    colorMarker.style.left = `${x}px`;
    colorMarker.style.top = `${y}px`;
    setColorAtPosition(x, y);
  }

  function updateColor(rgba = {}, hsva = {}) {
    let format = settings.format;

    for (const key in rgba) {
      currentColor[key] = rgba[key];
    }

    for (const key in hsva) {
      currentColor[key] = hsva[key];
    }

    const hex = RGBAToHex(currentColor);
    const opaqueHex = hex.substring(0, 7);

    colorMarker.style.color = opaqueHex;
    alphaMarker.parentNode.style.color = opaqueHex;
    alphaMarker.style.color = hex;
    colorPreview.style.color = hex;

    colorArea.style.display = 'none';
    colorArea.offsetHeight;
    colorArea.style.display = '';
    alphaMarker.nextElementSibling.style.display = 'none';
    alphaMarker.nextElementSibling.offsetHeight;
    alphaMarker.nextElementSibling.style.display = '';

    if (format === 'mixed') {
      format = currentColor.a === 1 ? 'hex' : 'rgb';
    } else if (format === 'auto') {
      format = currentFormat;
    }

    switch (format) {
      case 'hex':
        colorValue.value = hex;
        break;
      case 'rgb':
        colorValue.value = RGBAToStr(currentColor);
        break;
      case 'hsl':
        colorValue.value = HSLAToStr(HSVAtoHSLA(currentColor));
        break;
    }

    document.querySelector(`.clr-format [value="${format}"]`).checked = true;
  }

  function setHue() {
    const hue = hueSlider.value * 1;
    const x = colorMarker.style.left.replace('px', '') * 1;
    const y = colorMarker.style.top.replace('px', '') * 1;

    picker.style.color = `hsl(${hue}, 100%, 50%)`;
    hueMarker.style.left = `${hue / 360 * 100}%`;
    setColorAtPosition(x, y);
  }

  function setAlpha() {
    const alpha = alphaSlider.value / 100;
    alphaMarker.style.left = `${alpha * 100}%`;
    updateColor({ a: alpha });
    pickColor();
  }

  function HSVAtoRGBA(hsva) {
    const saturation = hsva.s / 100;
    const value = hsva.v / 100;
    let chroma = saturation * value;
    let hueBy60 = hsva.h / 60;
    let x = chroma * (1 - Math.abs(hueBy60 % 2 - 1));
    let m = value - chroma;

    chroma = (chroma + m);
    x = (x + m);

    const index = Math.floor(hueBy60) % 6;
    const red = [chroma, x, m, m, x, chroma][index];
    const green = [x, chroma, chroma, x, m, m][index];
    const blue = [m, m, x, chroma, chroma, x][index];

    return {
      r: Math.round(red * 255),
      g: Math.round(green * 255),
      b: Math.round(blue * 255),
      a: hsva.a
    };
  }

  function HSVAtoHSLA(hsva) {
    const value = hsva.v / 100;
    const lightness = value * (1 - (hsva.s / 100) / 2);
    let saturation;

    if (lightness > 0 && lightness < 1) {
      saturation = Math.round((value - lightness) / Math.min(lightness, 1 - lightness) * 100);
    }

    return {
      h: hsva.h,
      s: saturation || 0,
      l: Math.round(lightness * 100),
      a: hsva.a
    };
  }

  function RGBAtoHSVA(rgba) {
    const red = rgba.r / 255;
    const green = rgba.g / 255;
    const blue = rgba.b / 255;
    const xmax = Math.max(red, green, blue);
    const xmin = Math.min(red, green, blue);
    const chroma = xmax - xmin;
    const value = xmax;
    let hue = 0;
    let saturation = 0;

    if (chroma) {
      if (xmax === red) { hue = ((green - blue) / chroma); }
      if (xmax === green) { hue = 2 + (blue - red) / chroma; }
      if (xmax === blue) { hue = 4 + (red - green) / chroma; }
      if (xmax) { saturation = chroma / xmax; }
    }

    hue = Math.floor(hue * 60);

    return {
      h: hue < 0 ? hue + 360 : hue,
      s: Math.round(saturation * 100),
      v: Math.round(value * 100),
      a: rgba.a
    };
  }

  function strToRGBA(str) {
    const regex = /^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i;
    let match, rgba;

    ctx.fillStyle = '#000';
    ctx.fillStyle = str;
    match = regex.exec(ctx.fillStyle);

    if (match) {
      rgba = {
        r: match[3] * 1,
        g: match[4] * 1,
        b: match[5] * 1,
        a: match[6] * 1
      };
    } else {
      match = ctx.fillStyle.replace('#', '').match(/.{2}/g).map(h => parseInt(h, 16));
      rgba = {
        r: match[0],
        g: match[1],
        b: match[2],
        a: 1
      };
    }

    return rgba;
  }

  function RGBAToHex(rgba) {
    let R = rgba.r.toString(16);
    let G = rgba.g.toString(16);
    let B = rgba.b.toString(16);
    let A = '';

    if (rgba.r < 16) { R = '0' + R; }
    if (rgba.g < 16) { G = '0' + G; }
    if (rgba.b < 16) { B = '0' + B; }

    if (settings.alpha && (rgba.a < 1 || settings.forceAlpha)) {
      const alpha = rgba.a * 255 | 0;
      A = alpha.toString(16);
      if (alpha < 16) {
        A = '0' + A;
      }
    }

    return '#' + R + G + B + A;
  }

  function RGBAToStr(rgba) {
    if (!settings.alpha || (rgba.a === 1 && !settings.forceAlpha)) {
      return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
    } else {
      return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
    }
  }

  function HSLAToStr(hsla) {
    if (!settings.alpha || (hsla.a === 1 && !settings.forceAlpha)) {
      return `hsl(${hsla.h}, ${hsla.s}%, ${hsla.l}%)`;
    } else {
      return `hsla(${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${hsla.a})`;
    }
  }

  function init() {
    picker = document.createElement('div');
    picker.setAttribute('id', 'clr-picker');
    picker.className = 'clr-picker';
    picker.style.display = 'none';
    picker.innerHTML =
      `<input id="clr-color-value" name="clr-color-value" class="clr-color" type="text" value="" spellcheck="false" aria-label="${settings.a11y.input}">` +
      `<div id="clr-color-area" class="clr-gradient" role="application" aria-label="${settings.a11y.instruction}">` +
        '<div id="clr-color-marker" class="clr-marker"></div>' +
      '</div>' +
      '<div class="clr-hue">' +
        `<input id="clr-hue-slider" name="clr-hue-slider" type="range" min="0" max="360" step="1" aria-label="${settings.a11y.hueSlider}">` +
        '<div id="clr-hue-marker"></div>' +
      '</div>' +
      '<div class="clr-alpha">' +
        `<input id="clr-alpha-slider" name="clr-alpha-slider" type="range" min="0" max="100" step="1" aria-label="${settings.a11y.alphaSlider}">` +
        '<div id="clr-alpha-marker"></div>' +
        '<span></span>' +
      '</div>' +
      '<div id="clr-format" class="clr-format">' +
        '<fieldset class="clr-segmented">' +
          `<legend>${settings.a11y.format}</legend>` +
          '<input id="clr-f1" type="radio" name="clr-format" value="hex">' +
          '<label for="clr-f1">Hex</label>' +
          '<input id="clr-f2" type="radio" name="clr-format" value="rgb">' +
          '<label for="clr-f2">RGB</label>' +
          '<input id="clr-f3" type="radio" name="clr-format" value="hsl">' +
          '<label for="clr-f3">HSL</label>' +
          '<span></span>' +
        '</fieldset>' +
      '</div>' +
      '<div id="clr-swatches" class="clr-swatches"></div>' +
      `<button type="button" id="clr-clear" class="clr-clear" aria-label="${settings.a11y.clear}">${settings.clearLabel}</button>` +
      '<div id="clr-color-preview" class="clr-preview">' +
        `<button type="button" id="clr-close" class="clr-close" aria-label="${settings.a11y.close}">${settings.closeLabel}</button>` +
      '</div>' +
      `<span id="clr-open-label" hidden>${settings.a11y.open}</span>` +
      `<span id="clr-swatch-label" hidden>${settings.a11y.swatch}</span>`;

    document.body.appendChild(picker);

    colorArea = getEl('clr-color-area');
    colorMarker = getEl('clr-color-marker');
    clearButton = getEl('clr-clear');
    closeButton = getEl('clr-close');
    colorPreview = getEl('clr-color-preview');
    colorValue = getEl('clr-color-value');
    hueSlider = getEl('clr-hue-slider');
    hueMarker = getEl('clr-hue-marker');
    alphaSlider = getEl('clr-alpha-slider');
    alphaMarker = getEl('clr-alpha-marker');

    addListener(picker, 'mousedown', event => {
      event.stopPropagation();
    });

    addListener(colorArea, 'mousedown', () => {
      addListener(document, 'mousemove', moveMarker);
    });

    addListener(colorArea, 'contextmenu', event => {
      event.preventDefault();
    });

    addListener(colorMarker, 'mousedown', () => {
      addListener(document, 'mousemove', moveMarker);
    });

    addListener(colorValue, 'change', () => {
      const value = colorValue.value;

      if (currentEl) {
        const color = value === '' ? value : setColorFromStr(value);
        pickColor(color);
      }
    });

    addListener(clearButton, 'click', () => {
      pickColor('');
      closePicker();
    });

    addListener(closeButton, 'click', () => {
      pickColor();
      closePicker();
    });

    addListener(getEl('clr-format'), 'click', '.clr-format input', event => {
      currentFormat = event.target.value;
      updateColor();
      pickColor();
    });

    addListener(picker, 'click', '.clr-swatches button', event => {
      setColorFromStr(event.target.textContent);
      pickColor();

      if (settings.swatchesOnly) {
        closePicker();
      }
    });

    addListener(document, 'mouseup', () => {
      document.removeEventListener('mousemove', moveMarker);
    });

    addListener(document, 'mousedown', () => {
      closePicker();
    });

    addListener(colorArea, 'click', moveMarker);
    addListener(hueSlider, 'input', setHue);
    addListener(alphaSlider, 'input', setAlpha);
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function addListener(context, type, selector, fn) {
    if (typeof selector === 'string') {
      context.addEventListener(type, event => {
        if (event.target.matches(selector)) {
          fn.call(event.target, event);
        }
      });
    } else {
      fn = selector;
      context.addEventListener(type, fn);
    }
  }

  function DOMReady(fn, args) {
    args = args !== undefined ? args : [];

    if (document.readyState !== 'loading') {
      fn(...args);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        fn(...args);
      });
    }
  }

  window.Coloris = (() => {
    const methods = {
      init: ensureInit,
      set: configure,
      close: closePicker,
      updatePosition: updatePickerPosition,
      ready: DOMReady
    };

    function Coloris(options) {
      DOMReady(() => {
        if (options) {
          ensureInit();
          if (typeof options === 'string') {
            bindFields(options);
          } else {
            configure(options);
          }
        }
      });
    }

    for (const key in methods) {
      Coloris[key] = (...args) => {
        DOMReady(methods[key], args);
      };
    }

    return Coloris;
  })();
})(window, document, Math);

exports.MASK_FN = function() {
  var left = arguments[0];
  var top = arguments[1];
  
  var width = arguments[2];
  var height = arguments[3];
  var color = arguments[4];
  var zIndex = arguments[5];
  console.log('Masking ', top, left, width, height);
  
  var el = document.createElement('div');
  el.id = 'BP_ELEMENT_HIGHLIGHT__';
  document.body.appendChild(el);
  
  el.style['position'] = 'absolute';
  el.style['background-color'] = color;
  el.style['top'] = top + 'px';
  el.style['left'] = left + 'px';
  el.style['width'] = width + 'px';
  el.style['height'] = height + 'px';
  el.style['zIndex'] = zIndex;
  
  return el;
};

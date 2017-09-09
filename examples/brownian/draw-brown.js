console.log('Loaded.');
window.onload = main;

var POINTS     = 10,
    VARIATION  = 20,
    COLORSHIFT = 0.02,
    LINES      = 10;

function main() {

  // create context
  var canvas = document.getElementById("c");
  var gl = initGL(canvas);
  var clientWidth = gl.canvas.width;
  var clientHeight = gl.canvas.height;

  // create, link, and use program
  var program = createProgramFromScripts(gl, '2d-vertex-shader', '2d-fragment-shader');
  gl.useProgram(program);

  // set the uniforms
  var resolution = {
    type: 'uniform',
    name: 'u_resolution',
    shaderVar: 'u_resolution',
    data: [[clientWidth, clientHeight]],
    dataType: 'uniform2fv'
  };

  // create geometry & color

  var position = {
    type: 'attribute',
    name: 'a_position',
    shaderVar: 'a_position',
    unconvertedData: [],
    data: [],
    pointer: [],
  };

  var multiPos = Array(LINES).fill(0).map((n, idx) => {
    var vertices = initVertices(gl, POINTS, clientWidth, clientHeight);
    var updated = {
      unconvertedData: vertices,
      name: `${idx}-position`,
      pointer: [3, gl.FLOAT, false, 0, 0]
    }
    var myPos = Object.assign({}, position, updated);
    return myPos;
  });

  var baseColor = {
    type: 'attribute',
    name: 'a_color',
    shaderVar: 'a_color',
    unconvertedData: [],
    data: [],
    pointer: [],
    currentColor: [],
    counter: 0
  };

  var colors = initColors(POINTS, [0.325, 0.325, 0.36]);
  var multiColor = Array(LINES).fill(0).map((n, idx) => {
    var updated = {
      currentColor: [colors[0], colors[1], colors[2], colors[3]],
      unconvertedData: colors,
      name: `${idx}-color`,
      pointer: [4, gl.FLOAT, false, 0, 0],
    };

    return Object.assign({}, baseColor, updated);
  });

  var draw = {
    type: 'draw',
    name: 'd_draw', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    drawCall: gl.drawArrays,
    data: [gl.LINE_STRIP, 0, POINTS]
  }


  requestAnimationFrame(drawLine.bind(this, gl, multiPos, multiColor, VARIATION, COLORSHIFT));

  function drawLine(gl, positionArray, colorsArray, variation, colorShift){

    var updatedVertices = positionArray.map((pos) => {
      var vertices = pos.unconvertedData;

      // new point
      var x = clamp(vertices[vertices.length - 3] + plusOrMinus(variation), 0, gl.canvas.width, variation),
          y = clamp(vertices[vertices.length - 2] + plusOrMinus(variation), 0, gl.canvas.height, variation);


      // add new point, remove old, mutation is fun
      var nextVertices = vertices.slice(3);
      nextVertices.push(x, y, 0);
      pos.unconvertedData = nextVertices;
      pos.data = new Float32Array(nextVertices);

      return pos;
    });

    var updatedColors = colorsArray.map((color) => {
      // color shenanigans
      var r, g, b, a;

      color.counter++;

      if (color.counter > 10) {
        color.currentColor[0] += Math.random() > .5 ? colorShift : -colorShift;
        color.currentColor[1] += Math.random() > .5 ? colorShift : -colorShift;
        color.currentColor[2] += Math.random() > .5 ? colorShift : -colorShift;
        color.currentColor[3] = 1;
        color.counter = 0;
      }

      r = color.currentColor[0];
      g = color.currentColor[1];
      b = color.currentColor[2];
      a = color.currentColor[3];

      var lastColors = color.unconvertedData;
      var nextColors = lastColors.slice(4);
      nextColors.push(r, g, b, a);
      color.unconvertedData = nextColors;
      color.data = new Float32Array(nextColors);

      return color;
    });

    var updatedComponents = updatedVertices.map((comp, idx) => {
      return [resolution, updatedColors[idx], comp, draw];
    });


    render(gl, program, [].concat(...updatedComponents))

    requestAnimationFrame(drawLine.bind(null, gl, updatedVertices, updatedColors, variation, colorShift));
  }
}


function initGL(canvas) {
  var gl = canvas.getContext("webgl");

  if (!gl) {
   console.log('Wat, no gl.');
  }

  return gl;
}

////////////////////////////////////////////////////////
///// 🎨 DRAWING HELPER FUNCTIONS /////////////////////
////////////////////////////////////////////////////////

function initVertices(gl, times, width, height){
  var arr = [];
  var offsetX = Math.random() * width;
  var offsetY = Math.random() * height;


  for (var i = 0; i < times * 3; i += 3){
    arr.push(offsetX, offsetY, 0);
  }

  return arr;
}

function initColors(times, seed){

  var arr = [],
      r = seed[0] || Math.random(),
      g = seed[1] || Math.random(),
      b = seed[2] || Math.random(),
      a = 1;

  for (var i = 0; i < times * 4; i += 4){
    arr.push(r, g, b, a);
  }

  return arr;
}

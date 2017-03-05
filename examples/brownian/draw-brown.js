console.log('Loaded.');
window.onload = main;

function main() {

  // create context
  var canvas = document.getElementById("c");
  var gl = initGL(canvas);

  // create, link, and use program
  var program = createProgramFromScripts(gl, '2d-vertex-shader', '2d-fragment-shader');
  gl.useProgram(program);

  // // set attribute and uniform locations
  // var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  // var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  // var colorLocation = gl.getAttribLocation(program, "a_color");
  

  // set the uniforms
  var resolution = {
    type: 'uniform',
    name: 'u_resolution',
    data: [[gl.canvas.width, gl.canvas.height]],
    dataType: 'uniform2fv'
  }

  // gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);



  // create geometry & color

  var points    = 1000,
      variation = 20;


  var vertices = initVertices(gl, points),
      colors   = initColors(points);

  var position = {
    type: 'attribute',
    name: 'a_position',
    data: [],
    pointer: [3, gl.FLOAT, false, 0, 0],
  };

  var color = {
    type: 'attribute',
    name: 'a_color',
    data: [],
    pointer: [4, gl.FLOAT, false, 0, 0],
  };

  var draw = {
    type: 'draw',
    name: 'd_draw', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    drawCall: gl.drawArrays,
    data: [gl.LINE_STRIP, 0, vertices.length/3]
  }

  // var positionBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // gl.enableVertexAttribArray(positionAttributeLocation);
  // gl.vertexAttribPointer(
  //     positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  // var colorBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // gl.enableVertexAttribArray(colorLocation);
  // gl.vertexAttribPointer(
  //     colorLocation, 4, gl.FLOAT, false, 0, 0);


  var colorNow = [colors[0], colors[1], colors[2], colors[3]];

  requestAnimationFrame(drawLine.bind(this, gl, vertices, colorNow, variation, colors));

  function drawLine(gl, vertices, currentColor, variation, updatedColors, counter){

    // color shenanigans
    var r, g, b, a;
    var colorShift = 0.05;
    counter = ++counter || 0;

    if (counter > 10) {
      currentColor[0] += Math.random() > .5 ? colorShift : -colorShift;
      currentColor[1] += Math.random() > .5 ? colorShift : -colorShift;
      currentColor[2] += Math.random() > .5 ? colorShift : -colorShift;
      currentColor[3] = 1;
      counter = 0;
    }

    r = currentColor[0];
    g = currentColor[1];
    b = currentColor[2];
    a = currentColor[3];

    updatedColors = updatedColors.slice(4);
    updatedColors.push(r, g, b, a);
    color.data = new Float32Array(updatedColors);


    // new point
    var x = clamp(vertices[vertices.length - 3] + plusOrMinus(variation), 0, gl.canvas.width, variation),
        y = clamp(vertices[vertices.length - 2] + plusOrMinus(variation), 0, gl.canvas.height, variation);

    // add new point, remove old, mutation is fun
    var nextVertices = vertices.slice(3);
    nextVertices.push(x, y, 0);
    position.data = new Float32Array(nextVertices);

    render(gl, program, [resolution, color, position, draw])

    requestAnimationFrame(drawLine.bind(null, gl, nextVertices, currentColor, variation, updatedColors, counter));
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

function initVertices(gl, times){
  var arr = [];

  for (var i = 0; i < times * 3; i += 3){
    arr.push(gl.canvas.width/2, gl.canvas.height/2, 0);
  }

  return arr;
}



function initColors(times){

  var arr = [],
      r = Math.random(),
      g = Math.random(),
      b = Math.random(),
      a = 1;

  for (var i = 0; i < times * 4; i += 4){
    arr.push(r, g, b, a);
  }

  return arr;
}
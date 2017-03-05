console.log('Loaded.');
window.onload = main;

function main() {

  // create context
  var canvas = document.getElementById("c");
  var gl = initGL(canvas);

  // create, link, and use program
  var program = createProgramFromScripts(gl, '3d-vertex-shader', '3d-fragment-shader');

  // geometry
  var vertices = [
    // Front face
    0.0,    0.0,    100.0,
    100.0,  0.0,    100.0,
    100.0,  100.0,  100.0,
    0.0,    100.0,  100.0,
    
    // Back face
    0.0,    0.0,    0.0,
    0.0,    100.0,  0.0,
    100.0,  100.0,  0.0,
    100.0,  0.0,    0.0,
    
    // Top face
    0.0,    100.0,  0.0,
    0.0,    100.0,  100.0,
    100.0,  100.0,  100.0,
    100.0,  100.0,  0.0,
    
    // Bottom face
    0.0,    0.0,    0.0,
    100.0,  0.0,    0.0,
    100.0,  0.0,    100.0,
    0.0,    0.0,    100.0,
    
    // Right face
    100.0,    0.0,  0.0,
    100.0,  100.0,  0.0,
    100.0,  100.0,  100.0,
    100.0,    0.0,  100.0,
    
    // Left face
    0.0,    0.0,    0.0,
    0.0,    0.0,    100.0,
    0.0,  100.0,    100.0,
    0.0,  100.0,    0.0
  ];

  var position = {
    type: 'attribute',
    name: 'a_position',
    data: new Float32Array(vertices),
    pointer: [3, gl.FLOAT, false, 0, 0],
  };

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ];

  var cubeVertexIndex = {
    type: 'element_arr',
    name: 'e_indices', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    data: new Uint16Array(cubeVertexIndices),
  };

  // matrix
  var initialMatrix = {
    translation  : [gl.canvas.clientWidth/3, gl.canvas.clientHeight/3, 40],
    rotation     : [1, 1, 1],
    scale        : [1, 1, 1],
  };

  var transformMatrix = {
    type: 'uniform',
    name: 'u_matrix',
    data: [],
    dataType: 'uniformMatrix4fv'
  };

  // color
  var colors = generateColors();
  
  var color = {
    type: 'attribute',
    name: 'a_color',
    data: new Float32Array(colors),
    pointer: [4, gl.FLOAT, false, 0, 0],
  };

  // draw 
  var draw = {
    type: 'draw',
    name: 'd_draw', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    drawCall: gl.drawElements,
    data: [gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0]
  }

  // animate
  function animateCube(gl, program, components, rts){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    rts.rotation = rts.rotation.map((r, i) => r += (.01 * i));
    rts.translation = rts.translation.map((t, i) => {
      if (i < 2){
        return clamp(t + plusOrMinus(0.1), 0, 400, i + 1);
      } else {
        return t;
      }
    });

    // Compute the matrix
    var matrix = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 400);
        matrix = m4.translate(matrix, rts.translation[0], rts.translation[1], rts.translation[2]);
        matrix = m4.xRotate(matrix, rts.rotation[0]);
        matrix = m4.yRotate(matrix, rts.rotation[1]);
        matrix = m4.zRotate(matrix, rts.rotation[2]);
        matrix = m4.scale(matrix, rts.scale[0], rts.scale[1], rts.scale[2]);
    transformMatrix.data = [false, matrix]; // this uses the reference FOR us; will be changed when moved to cljs

    render(gl, program, components);
    requestAnimationFrame(animateCube.bind(null, gl, program, components, rts));
  }

  var drawUs = [position, cubeVertexIndex, transformMatrix, color, draw];
  requestAnimationFrame(animateCube.bind(null, gl, program, drawUs, initialMatrix));
  
}


function initGL(canvas) {
  var gl = canvas.getContext("webgl");
  
  if (!gl) {
   console.log('Wat, no gl.');
  }

  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  return gl;
}


console.log('Loaded.');
window.onload = main;

function main() {

  // create context
  const canvas = document.getElementById("c");
  const gl = initGL(canvas);

  // create, link, and use program
  const program = createProgramFromScripts(gl, '3d-vertex-shader', '3d-fragment-shader');

  // geometry
  const vertices = [
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

  const position = {
    type: 'attribute',
    name: 'a_position',
    data: new Float32Array(vertices),
    pointer: [3, gl.FLOAT, false, 0, 0],
  };

  const cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ];

  const cubeVertexIndex = {
    type: 'element_arr',
    name: 'e_indices', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    data: new Uint16Array(cubeVertexIndices),
  };

  // matrix
  const initialMatrix = {
    translation  : [gl.canvas.clientWidth/3, gl.canvas.clientHeight/3, 40],
    rotation     : [1, 1, 1],
    scale        : [1, 1, 1],
  };

  const multiMatrix = _.map(_.range(1000), (n) => {
    let myMat = Object.assign({}, initialMatrix);
    myMat.translation = [Math.random() * 1000, Math.random() * 1000, Math.random() * 40];
    myMat.rotation = [Math.random() * 7.28, Math.random() * 7.28, 1];
    return myMat;
  });

  const transformMatrix = {
    type: 'uniform',
    name: 'u_matrix',
    data: [],
    dataType: 'uniformMatrix4fv'
  };

  // color
  const colors = generateColors();

  const color = {
    type: 'attribute',
    name: 'a_color',
    data: new Float32Array(colors),
    pointer: [4, gl.FLOAT, false, 0, 0],
  };

  // draw
  const draw = {
    type: 'draw',
    name: 'd_draw', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    drawCall: gl.drawElements,
    data: [gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0]
  }


  var clientWidth = gl.canvas.clientWidth;
  var clientHeight = gl.canvas.clientHeight;

  // animate
  function animateCube(gl, program, components, rts, timestamp){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let cubes = multiMatrix.map((mat) => {
      mat.rotation = mat.rotation.map((r, i) => r += (.01 * i));

      // Compute the matrix
      let matrix = m4.projection(clientWidth, clientHeight, 400);
          matrix = m4.translate(matrix, mat.translation[0], mat.translation[1], mat.translation[2]);
          matrix = m4.xRotate(matrix, mat.rotation[0]);
          matrix = m4.yRotate(matrix, mat.rotation[1]);
          matrix = m4.zRotate(matrix, mat.rotation[2]);
          matrix = m4.scale(matrix, mat.scale[0], mat.scale[1], mat.scale[2]);

      myTransform = Object.assign({}, transformMatrix)
      myTransform.data = [false, matrix];

      return [position, cubeVertexIndex, myTransform, color, draw]
    });

    render(gl, program, _.flatten(cubes));
    requestAnimationFrame(animateCube.bind(null, gl, program, components, rts));
  }

  const drawUs = [position, cubeVertexIndex, transformMatrix, color, draw];
  requestAnimationFrame(animateCube.bind(null, gl, program, drawUs, initialMatrix));

}


function initGL(canvas) {
  const gl = canvas.getContext("webgl");

  if (!gl) {
   console.log('Wat, no gl.');
  }

  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  return gl;
}
